using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;
using WebApp.Infrastructure.Data;
using WebApp.Infrastructure.Repositories;
using WebApp.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Swagger configuration
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "WebApp API", 
        Version = "v1",
        Description = "CMS Web Application API"
    });
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Database configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
        sqlOptions.CommandTimeout(60);
    }));

// Identity configuration
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 6;
    options.User.RequireUniqueEmail = true;
    options.SignIn.RequireConfirmedEmail = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddRoles<IdentityRole>()
.AddDefaultTokenProviders();

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not found");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "WebApp",
        ValidAudience = jwtSettings["Audience"] ?? "WebAppUsers",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

// CORS configuration - Allow video streaming
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .WithExposedHeaders("Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"); // Expose headers for Range requests
    });
});

// Dependency Injection
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IFileService, FileService>();

// SignalR for WebSocket notifications
builder.Services.AddSignalR();

// Background Service for Video Conversion
builder.Services.AddHostedService<WebApp.Infrastructure.Services.VideoConversionService>();

// File upload configuration - Support up to 5GB files
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 5L * 1024 * 1024 * 1024; // 5GB
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartHeadersLengthLimit = int.MaxValue;
    options.MemoryBufferThreshold = int.MaxValue;
});

       // Increase Kestrel limits for large file uploads and streaming (up to 5GB)
       builder.WebHost.ConfigureKestrel(serverOptions =>
       {
           serverOptions.Limits.MaxRequestBodySize = 5L * 1024 * 1024 * 1024; // 5GB
           serverOptions.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(30);
           serverOptions.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(5);
           // Tối ưu cho streaming: tăng max response buffer
           serverOptions.Limits.MaxResponseBufferSize = 10 * 1024 * 1024; // 10MB response buffer
           // Tăng min response data rate để streaming mượt hơn
           serverOptions.Limits.MinResponseDataRate = new Microsoft.AspNetCore.Server.Kestrel.Core.MinDataRate(
               bytesPerSecond: 1024 * 1024, // 1MB/s minimum
               gracePeriod: TimeSpan.FromSeconds(10)
           );
       });

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SignalR Hub for WebSocket notifications
app.MapHub<WebApp.Infrastructure.Hubs.VideoConversionHub>("/hubs/video-conversion");

// Initialize database and seed default data
_ = Task.Run(async () =>
{
    // Đợi app start hoàn toàn
    await Task.Delay(3000);
    
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("Initializing database...");
        
        var context = services.GetRequiredService<ApplicationDbContext>();
        var userManager = services.GetRequiredService<UserManager<User>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var configuration = services.GetRequiredService<IConfiguration>();
        
        // Retry logic cho database connection
        var maxRetries = 5;
        var retryCount = 0;
        var success = false;
        
        while (retryCount < maxRetries && !success)
        {
            try
            {
                // Test connection first
                if (await context.Database.CanConnectAsync())
                {
                    await DbInitializer.InitializeAsync(context, userManager, roleManager, configuration);
                    success = true;
                    logger.LogInformation("Database initialized successfully.");
                }
                else
                {
                    throw new Exception("Cannot connect to database");
                }
            }
            catch (Exception ex)
            {
                retryCount++;
                logger.LogWarning(ex, "Database initialization attempt {RetryCount}/{MaxRetries} failed. Retrying in {Delay} seconds...", 
                    retryCount, maxRetries, retryCount * 2);
                
                if (retryCount < maxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(retryCount * 2)); // Exponential backoff
                }
                else
                {
                    logger.LogError(ex, "Failed to initialize database after {MaxRetries} attempts. Please check your database connection.", maxRetries);
                }
            }
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while initializing the database.");
    }
});

app.Run();

