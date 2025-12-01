using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Core.Entities;
using WebApp.Infrastructure.Data;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")] // Chỉ Admin được quản lý quyền chi tiết
public class PermissionsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public PermissionsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetPermissions()
    {
        var permissions = await _dbContext.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Code)
            .ToListAsync();

        return Ok(permissions);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePermission([FromBody] Permission permission)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        permission.Code = permission.Code.Trim().ToUpperInvariant();

        if (await _dbContext.Permissions.AnyAsync(p => p.Code == permission.Code))
        {
            return BadRequest("Permission code already exists.");
        }

        await _dbContext.Permissions.AddAsync(permission);
        await _dbContext.SaveChangesAsync();

        return Ok(permission);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdatePermission(int id, [FromBody] Permission permission)
    {
        var existing = await _dbContext.Permissions.FindAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        existing.Name = permission.Name;
        existing.Description = permission.Description;
        existing.Module = permission.Module;
        existing.IsActive = permission.IsActive;

        await _dbContext.SaveChangesAsync();

        return Ok(existing);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePermission(int id)
    {
        var existing = await _dbContext.Permissions.FindAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        _dbContext.Permissions.Remove(existing);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }
}


