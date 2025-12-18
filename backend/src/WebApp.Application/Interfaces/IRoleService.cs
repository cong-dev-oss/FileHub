using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Users;

namespace WebApp.Application.Interfaces;

public interface IRoleService
{
    Task<ServiceResult<List<RoleDto>>> GetRolesAsync();
    Task<ServiceResult<bool>> CreateRoleAsync(string roleName);
    Task<ServiceResult<bool>> DeleteRoleAsync(string roleId);
    Task<ServiceResult<List<string>>> GetRolePermissionsAsync(string roleId);
    Task<ServiceResult<bool>> SetRolePermissionsAsync(string roleId, List<string> permissionCodes);
}
