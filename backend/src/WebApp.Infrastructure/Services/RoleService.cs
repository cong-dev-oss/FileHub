using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Users;
using WebApp.Application.Interfaces;
using WebApp.Core.Entities;
using WebApp.Infrastructure.Data;

namespace WebApp.Infrastructure.Services;

public class RoleService : IRoleService
{
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ApplicationDbContext _dbContext;

    public RoleService(
        RoleManager<IdentityRole> roleManager,
        ApplicationDbContext dbContext)
    {
        _roleManager = roleManager;
        _dbContext = dbContext;
    }

    public async Task<ServiceResult<List<RoleDto>>> GetRolesAsync()
    {
        var roles = await _roleManager.Roles
            .Select(r => new RoleDto
            {
                Id = r.Id,
                Name = r.Name!
            })
            .ToListAsync();

        return ServiceResult<List<RoleDto>>.Ok(roles);
    }

    public async Task<ServiceResult<bool>> CreateRoleAsync(string roleName)
    {
        if (string.IsNullOrWhiteSpace(roleName))
        {
            return ServiceResult<bool>.Fail("Tên vai trò là bắt buộc");
        }

        if (await _roleManager.RoleExistsAsync(roleName))
        {
            return ServiceResult<bool>.Fail("Vai trò đã tồn tại");
        }

        var result = await _roleManager.CreateAsync(new IdentityRole(roleName));
        if (!result.Succeeded)
        {
            var errorMessages = result.Errors.Select(e => e.Description).ToList();
            return ServiceResult<bool>.Fail(errorMessages);
        }

        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<bool>> DeleteRoleAsync(string roleId)
    {
        var role = await _roleManager.FindByIdAsync(roleId);
        if (role == null)
        {
            return ServiceResult<bool>.Fail("Không tìm thấy vai trò");
        }

        var result = await _roleManager.DeleteAsync(role);
        if (!result.Succeeded)
        {
            var errorMessages = result.Errors.Select(e => e.Description).ToList();
            return ServiceResult<bool>.Fail(errorMessages);
        }

        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<List<string>>> GetRolePermissionsAsync(string roleId)
    {
        var role = await _roleManager.FindByIdAsync(roleId);
        if (role == null)
        {
            return ServiceResult<List<string>>.Fail("Không tìm thấy vai trò");
        }

        var permissionCodes = await _dbContext.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .Include(rp => rp.Permission)
            .Select(rp => rp.Permission.Code)
            .ToListAsync();

        return ServiceResult<List<string>>.Ok(permissionCodes);
    }

    public async Task<ServiceResult<bool>> SetRolePermissionsAsync(string roleId, List<string> permissionCodes)
    {
        var role = await _roleManager.FindByIdAsync(roleId);
        if (role == null)
        {
            return ServiceResult<bool>.Fail("Không tìm thấy vai trò");
        }

        permissionCodes = permissionCodes
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim().ToUpperInvariant())
            .Distinct()
            .ToList();

        var permissions = await _dbContext.Permissions
            .Where(p => permissionCodes.Contains(p.Code))
            .ToListAsync();

        // Xóa các mapping cũ
        var existing = await _dbContext.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .ToListAsync();

        _dbContext.RolePermissions.RemoveRange(existing);

        // Thêm mapping mới
        var newMappings = permissions.Select(p => new RolePermission
        {
            RoleId = roleId,
            PermissionId = p.Id
        });

        await _dbContext.RolePermissions.AddRangeAsync(newMappings);
        await _dbContext.SaveChangesAsync();

        return ServiceResult<bool>.Ok(true);
    }
}
