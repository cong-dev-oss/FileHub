using Microsoft.EntityFrameworkCore;
using WebApp.Application.DTOs.Common;
using WebApp.Application.Interfaces;
using WebApp.Core.Entities;
using WebApp.Infrastructure.Data;

namespace WebApp.Infrastructure.Services;

public class PermissionService : IPermissionService
{
    private readonly ApplicationDbContext _dbContext;

    public PermissionService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ServiceResult<List<Permission>>> GetPermissionsAsync()
    {
        var permissions = await _dbContext.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Code)
            .ToListAsync();

        return ServiceResult<List<Permission>>.Ok(permissions);
    }

    public async Task<ServiceResult<Permission>> CreatePermissionAsync(Permission permission)
    {
        permission.Code = permission.Code.Trim().ToUpperInvariant();

        if (await _dbContext.Permissions.AnyAsync(p => p.Code == permission.Code))
        {
            return ServiceResult<Permission>.Fail("Mã quyền đã tồn tại");
        }

        await _dbContext.Permissions.AddAsync(permission);
        await _dbContext.SaveChangesAsync();

        return ServiceResult<Permission>.Ok(permission);
    }

    public async Task<ServiceResult<Permission>> UpdatePermissionAsync(int id, Permission permission)
    {
        var existing = await _dbContext.Permissions.FindAsync(id);
        if (existing == null)
        {
            return ServiceResult<Permission>.Fail("Không tìm thấy quyền");
        }

        existing.Name = permission.Name;
        existing.Description = permission.Description;
        existing.Module = permission.Module;
        existing.IsActive = permission.IsActive;

        await _dbContext.SaveChangesAsync();

        return ServiceResult<Permission>.Ok(existing);
    }

    public async Task<ServiceResult<bool>> DeletePermissionAsync(int id)
    {
        var existing = await _dbContext.Permissions.FindAsync(id);
        if (existing == null)
        {
            return ServiceResult<bool>.Fail("Không tìm thấy quyền");
        }

        _dbContext.Permissions.Remove(existing);
        await _dbContext.SaveChangesAsync();

        return ServiceResult<bool>.Ok(true);
    }
}
