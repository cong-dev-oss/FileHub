using WebApp.Application.DTOs.Auth;
using WebApp.Application.DTOs.Common;

namespace WebApp.Application.Interfaces;

public interface IAuthService
{
    Task<ServiceResult<AuthResponseDto>> RegisterAsync(RegisterDto registerDto);
    Task<ServiceResult<AuthResponseDto>> LoginAsync(LoginDto loginDto);
    Task<ServiceResult<UserDto>> GetCurrentUserAsync(string userId);
}
