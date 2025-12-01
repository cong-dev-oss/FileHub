using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using WebApp.Core.Entities;

namespace WebApp.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(
        ApplicationDbContext context,
        UserManager<User> userManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration)
    {
        try
        {
            // First, create database if it doesn't exist
            var connectionString = context.Database.GetConnectionString();
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Connection string is null or empty");
            }

            var builder = new SqlConnectionStringBuilder(connectionString);
            var dbName = builder.InitialCatalog;
            builder.InitialCatalog = "master";

            // Create database if it doesn't exist
            using (var connection = new SqlConnection(builder.ConnectionString))
            {
                await connection.OpenAsync();
                var command = connection.CreateCommand();
                command.CommandText = $@"
                    IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '{dbName}')
                    BEGIN
                        CREATE DATABASE [{dbName}]
                    END";
                await command.ExecuteNonQueryAsync();
            }

            // Wait a bit for database to be ready
            await Task.Delay(1000);

            // Now ensure the database schema is created
            if (context.Database.GetPendingMigrations().Any())
            {
                await context.Database.MigrateAsync();
            }
            else
            {
                await context.Database.EnsureCreatedAsync();
            }
        }
        catch (Exception ex)
        {
            // If database creation fails, try to continue with EnsureCreated
            // which might work if database already exists
            try
            {
                if (context.Database.GetPendingMigrations().Any())
                {
                    await context.Database.MigrateAsync();
                }
                else
                {
                    await context.Database.EnsureCreatedAsync();
                }
            }
            catch
            {
                throw new Exception($"Failed to initialize database: {ex.Message}", ex);
            }
        }

        // Create default roles
        var adminRole = "Admin";
        var userRole = "User";

        if (!await roleManager.RoleExistsAsync(adminRole))
        {
            await roleManager.CreateAsync(new IdentityRole(adminRole));
        }

        if (!await roleManager.RoleExistsAsync(userRole))
        {
            await roleManager.CreateAsync(new IdentityRole(userRole));
        }

        // Seed default permissions
        if (!context.Permissions.Any())
        {
            var defaultPermissions = new List<Permission>
            {
                // Content
                new() { Code = "CONTENT_VIEW", Name = "Xem nội dung", Module = "Content" },
                new() { Code = "CONTENT_CREATE", Name = "Tạo nội dung", Module = "Content" },
                new() { Code = "CONTENT_EDIT", Name = "Sửa nội dung", Module = "Content" },
                new() { Code = "CONTENT_DELETE", Name = "Xóa nội dung", Module = "Content" },

                // Files
                new() { Code = "FILE_VIEW", Name = "Xem tệp", Module = "File" },
                new() { Code = "FILE_UPLOAD", Name = "Tải lên tệp", Module = "File" },
                new() { Code = "FILE_DELETE", Name = "Xóa tệp", Module = "File" },

                // Users & Roles
                new() { Code = "USER_VIEW", Name = "Xem người dùng", Module = "User" },
                new() { Code = "USER_MANAGE", Name = "Quản lý người dùng", Module = "User" },
                new() { Code = "ROLE_VIEW", Name = "Xem nhóm quyền", Module = "Role" },
                new() { Code = "ROLE_MANAGE", Name = "Quản lý nhóm quyền", Module = "Role" },
                new() { Code = "PERMISSION_VIEW", Name = "Xem quyền chi tiết", Module = "Permission" },
                new() { Code = "PERMISSION_MANAGE", Name = "Quản lý quyền chi tiết", Module = "Permission" },
            };

            await context.Permissions.AddRangeAsync(defaultPermissions);
            await context.SaveChangesAsync();
        }

        // Gán tất cả quyền cho role Admin
        var adminIdentityRole = await roleManager.FindByNameAsync(adminRole);
        if (adminIdentityRole != null)
        {
            var adminRoleId = adminIdentityRole.Id;
            var allPermissionIds = context.Permissions.Select(p => p.Id).ToList();

            var existing = context.RolePermissions
                .Where(rp => rp.RoleId == adminRoleId)
                .Select(rp => rp.PermissionId)
                .ToHashSet();

            var newRolePermissions = allPermissionIds
                .Where(pid => !existing.Contains(pid))
                .Select(pid => new RolePermission
                {
                    RoleId = adminRoleId,
                    PermissionId = pid
                })
                .ToList();

            if (newRolePermissions.Any())
            {
                await context.RolePermissions.AddRangeAsync(newRolePermissions);
                await context.SaveChangesAsync();
            }
        }

        // Create default admin user
        var defaultAdminEmail = configuration["DefaultAdmin:Email"] ?? "admin@webapp.com";
        var defaultAdminPassword = configuration["DefaultAdmin:Password"] ?? "Admin@123";
        var defaultAdminFirstName = configuration["DefaultAdmin:FirstName"] ?? "Admin";
        var defaultAdminLastName = configuration["DefaultAdmin:LastName"] ?? "User";

        var adminUser = await userManager.FindByEmailAsync(defaultAdminEmail);
        if (adminUser == null)
        {
            adminUser = new User
            {
                UserName = defaultAdminEmail,
                Email = defaultAdminEmail,
                FirstName = defaultAdminFirstName,
                LastName = defaultAdminLastName,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(adminUser, defaultAdminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, adminRole);
            }
        }
    }
}

