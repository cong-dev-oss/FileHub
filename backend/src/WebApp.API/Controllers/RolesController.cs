using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Core.Entities;
using WebApp.Infrastructure.Data;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")] // Chỉ Admin mặc định được quản lý nhóm quyền
public class RolesController : ControllerBase
{
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ApplicationDbContext _dbContext;

    public RolesController(
        RoleManager<IdentityRole> roleManager,
        ApplicationDbContext dbContext)
    {
        _roleManager = roleManager;
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _roleManager.Roles
            .Select(r => new
            {
                r.Id,
                r.Name
            })
            .ToListAsync();

        return Ok(roles);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] string roleName)
    {
        if (string.IsNullOrWhiteSpace(roleName))
        {
            return BadRequest("Role name is required.");
        }

        if (await _roleManager.RoleExistsAsync(roleName))
        {
            return BadRequest("Role already exists.");
        }

        var result = await _roleManager.CreateAsync(new IdentityRole(roleName));
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return Ok();
    }

    [HttpDelete("{roleId}")]
    public async Task<IActionResult> DeleteRole(string roleId)
    {
        var role = await _roleManager.FindByIdAsync(roleId);
        if (role == null)
        {
            return NotFound();
        }

        var result = await _roleManager.DeleteAsync(role);
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return NoContent();
    }

    /// <summary>
    /// Lấy danh sách permission gán cho một role.
    /// </summary>
    [HttpGet("{roleId}/permissions")]
    public async Task<IActionResult> GetRolePermissions(string roleId)
    {
        var role = await _roleManager.FindByIdAsync(roleId);
        if (role == null)
        {
            return NotFound();
        }

        var permissionCodes = await _dbContext.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .Include(rp => rp.Permission)
            .Select(rp => rp.Permission.Code)
            .ToListAsync();

        return Ok(permissionCodes);
    }

    /// <summary>
    /// Gán danh sách permission code cho một role (ghi đè).
    /// </summary>
    [HttpPost("{roleId}/permissions")]
    public async Task<IActionResult> SetRolePermissions(string roleId, [FromBody] List<string> permissionCodes)
    {
        var role = await _roleManager.FindByIdAsync(roleId);
        if (role == null)
        {
            return NotFound();
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

        return Ok();
    }
}


