using WebApp.Application.DTOs.Common;
using WebApp.Core.Entities;

namespace WebApp.Application.Interfaces;

public interface IPermissionService
{
    Task<ServiceResult<List<Permission>>> GetPermissionsAsync();
    Task<ServiceResult<Permission>> CreatePermissionAsync(Permission permission);
    Task<ServiceResult<Permission>> UpdatePermissionAsync(int id, Permission permission);
    Task<ServiceResult<bool>> DeletePermissionAsync(int id);
}
