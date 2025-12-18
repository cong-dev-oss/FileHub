using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApp.API.Extensions;
using WebApp.Application.DTOs.Auth;
using WebApp.Application.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var result = await _authService.RegisterAsync(registerDto);
        if (!result.Success)
        {
            if (result.Errors != null && result.Errors.Any())
            {
                var errors = new Dictionary<string, string[]> { { "General", result.Errors.ToArray() } };
                return this.BadRequestResponse(result.ErrorMessage ?? "Đăng ký thất bại", errors, "REGISTRATION_FAILED");
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Đăng ký thất bại", "REGISTRATION_FAILED");
        }

        return this.OkResponse(result.Data!, "Đăng ký thành công");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var result = await _authService.LoginAsync(loginDto);
        if (!result.Success)
        {
            return this.UnauthorizedResponse(result.ErrorMessage ?? "Thông tin đăng nhập không hợp lệ", "INVALID_CREDENTIALS");
        }

        return this.OkResponse(result.Data!, "Đăng nhập thành công");
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _authService.GetCurrentUserAsync(userId);
        if (!result.Success)
        {
            return this.NotFoundResponse(result.ErrorMessage ?? "Không tìm thấy người dùng");
        }

        return this.OkResponse(result.Data!, "Lấy thông tin người dùng thành công");
    }
}



