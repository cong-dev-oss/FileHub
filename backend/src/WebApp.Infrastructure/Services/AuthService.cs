using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using WebApp.Application.DTOs.Auth;
using WebApp.Application.DTOs.Common;
using WebApp.Application.Interfaces;
using WebApp.Core.Entities;
using WebApp.Infrastructure.Data;

namespace WebApp.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _dbContext;

    public AuthService(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IConfiguration configuration,
        ApplicationDbContext dbContext)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _dbContext = dbContext;
    }

    public async Task<ServiceResult<AuthResponseDto>> RegisterAsync(RegisterDto registerDto)
    {
        var user = new User
        {
            UserName = registerDto.Email,
            Email = registerDto.Email,
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, registerDto.Password);

        if (!result.Succeeded)
        {
            var errorMessages = result.Errors.Select(e => e.Description).ToList();
            return ServiceResult<AuthResponseDto>.Fail(errorMessages);
        }

        var (token, roles, permissions) = await GenerateJwtTokenAsync(user);
        var refreshToken = GenerateRefreshToken();

        var authResponse = new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(60),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email!,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = roles,
                Permissions = permissions
            },
            Roles = roles,
            Permissions = permissions
        };

        return ServiceResult<AuthResponseDto>.Ok(authResponse);
    }

    public async Task<ServiceResult<AuthResponseDto>> LoginAsync(LoginDto loginDto)
    {
        var user = await _userManager.FindByEmailAsync(loginDto.Email);
        if (user == null || !user.IsActive)
        {
            return ServiceResult<AuthResponseDto>.Fail("Thông tin đăng nhập không hợp lệ");
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, loginDto.Password, false);
        if (!result.Succeeded)
        {
            return ServiceResult<AuthResponseDto>.Fail("Thông tin đăng nhập không hợp lệ");
        }

        var (token, roles, permissions) = await GenerateJwtTokenAsync(user);
        var refreshToken = GenerateRefreshToken();

        var authResponse = new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(60),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email!,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = roles,
                Permissions = permissions
            },
            Roles = roles,
            Permissions = permissions
        };

        return ServiceResult<AuthResponseDto>.Ok(authResponse);
    }

    public async Task<ServiceResult<UserDto>> GetCurrentUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return ServiceResult<UserDto>.Fail("Không tìm thấy người dùng");
        }

        var roles = await _userManager.GetRolesAsync(user);

        var roleIds = await _dbContext.Roles
            .Where(r => roles.Contains(r.Name!))
            .Select(r => r.Id)
            .ToListAsync();

        var permissions = await _dbContext.RolePermissions
            .Where(rp => roleIds.Contains(rp.RoleId))
            .Include(rp => rp.Permission)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToListAsync();

        var userDto = new UserDto
        {
            Id = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = roles.ToList(),
            Permissions = permissions
        };

        return ServiceResult<UserDto>.Ok(userDto);
    }

    private async Task<(string token, List<string> roles, List<string> permissions)> GenerateJwtTokenAsync(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"]!;
        var issuer = jwtSettings["Issuer"]!;
        var audience = jwtSettings["Audience"]!;
        var expirationMinutes = int.Parse(jwtSettings["ExpirationInMinutes"] ?? "60");

        var roles = await _userManager.GetRolesAsync(user);

        var roleIds = await _dbContext.Roles
            .Where(r => roles.Contains(r.Name!))
            .Select(r => r.Id)
            .ToListAsync();

        var permissions = await _dbContext.RolePermissions
            .Where(rp => roleIds.Contains(rp.RoleId))
            .Include(rp => rp.Permission)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToListAsync();

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // Add role claims
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        // Add permission claims
        foreach (var permission in permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return (tokenString, roles.ToList(), permissions);
    }

    private string GenerateRefreshToken()
    {
        return Guid.NewGuid().ToString();
    }
}
