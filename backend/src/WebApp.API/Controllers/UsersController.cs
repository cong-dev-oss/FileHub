using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Core.DTOs.Users;
using WebApp.Core.Entities;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public UsersController(
        UserManager<User> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        _userManager = userManager;
        _roleManager = roleManager;
    }

    /// <summary>
    /// Tạo user mới (Admin tạo, không phải tự đăng ký).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        if (dto.Password != dto.ConfirmPassword)
        {
            return BadRequest("Password and confirm password do not match.");
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            return BadRequest("Email already in use.");
        }

        var user = new User
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            EmailConfirmed = true
        };

        var createResult = await _userManager.CreateAsync(user, dto.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(createResult.Errors);
        }

        // Gán roles nếu có
        if (dto.Roles != null && dto.Roles.Count > 0)
        {
            var validRoles = await _roleManager.Roles
                .Select(r => r.Name!)
                .ToListAsync();

            var rolesToAssign = dto.Roles
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim())
                .Distinct()
                .Where(r => validRoles.Contains(r))
                .ToList();

            if (rolesToAssign.Any())
            {
                var roleResult = await _userManager.AddToRolesAsync(user, rolesToAssign);
                if (!roleResult.Succeeded)
                {
                    return BadRequest(roleResult.Errors);
                }
            }
        }

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, new { user.Id, user.Email });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        // Không cho xóa chính mình
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId == user.Id)
        {
            return BadRequest("You cannot delete your own account.");
        }

        var deleteResult = await _userManager.DeleteAsync(user);
        if (!deleteResult.Succeeded)
        {
            return BadRequest(deleteResult.Errors);
        }

        return NoContent();
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userManager.Users
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var result = new List<UserListItemDto>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(new UserListItemDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                Roles = roles
            });
        }

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new UserListItemDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Roles = roles
        });
    }

    [HttpPut("{id}/roles")]
    public async Task<IActionResult> UpdateUserRoles(string id, [FromBody] UpdateUserRolesDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        var currentRoles = await _userManager.GetRolesAsync(user);

        // Kiểm tra role hợp lệ
        var validRoles = await _roleManager.Roles
            .Select(r => r.Name!)
            .ToListAsync();

        var normalizedNewRoles = dto.Roles
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r.Trim())
            .Distinct()
            .ToList();

        foreach (var role in normalizedNewRoles)
        {
            if (!validRoles.Contains(role))
            {
                return BadRequest($"Role '{role}' is not valid.");
            }
        }

        var rolesToRemove = currentRoles.Where(r => !normalizedNewRoles.Contains(r)).ToList();
        var rolesToAdd = normalizedNewRoles.Where(r => !currentRoles.Contains(r)).ToList();

        if (rolesToRemove.Any())
        {
            var removeResult = await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
            if (!removeResult.Succeeded)
            {
                return BadRequest(removeResult.Errors);
            }
        }

        if (rolesToAdd.Any())
        {
            var addResult = await _userManager.AddToRolesAsync(user, rolesToAdd);
            if (!addResult.Succeeded)
            {
                return BadRequest(addResult.Errors);
            }
        }

        return NoContent();
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] UpdateUserStatusDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return NoContent();
    }
}


