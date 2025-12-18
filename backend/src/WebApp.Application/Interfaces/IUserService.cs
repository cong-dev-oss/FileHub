using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Users;

namespace WebApp.Application.Interfaces;

public interface IUserService
{
    Task<ServiceResult<object>> CreateUserAsync(CreateUserDto dto, string currentUserId);
    Task<ServiceResult<bool>> DeleteUserAsync(string id, string currentUserId);
    Task<ServiceResult<List<UserListItemDto>>> GetUsersAsync();
    Task<ServiceResult<UserListItemDto>> GetUserByIdAsync(string id);
    Task<ServiceResult<bool>> UpdateUserRolesAsync(string id, UpdateUserRolesDto dto);
    Task<ServiceResult<bool>> UpdateUserStatusAsync(string id, UpdateUserStatusDto dto);
}
