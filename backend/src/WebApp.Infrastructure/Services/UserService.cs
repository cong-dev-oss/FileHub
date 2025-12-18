using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Users;
using WebApp.Application.Interfaces;
using WebApp.Core.Entities;

namespace WebApp.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public UserService(
        UserManager<User> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public async Task<ServiceResult<object>> CreateUserAsync(CreateUserDto dto, string currentUserId)
    {
        if (dto.Password != dto.ConfirmPassword)
        {
            return ServiceResult<object>.Fail("Mật khẩu và xác nhận mật khẩu không khớp");
        }

        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            return ServiceResult<object>.Fail("Email đã được sử dụng");
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
            var errorMessages = createResult.Errors.Select(e => e.Description).ToList();
            return ServiceResult<object>.Fail(errorMessages);
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
                    var errorMessages = roleResult.Errors.Select(e => e.Description).ToList();
                    return ServiceResult<object>.Fail(errorMessages);
                }
            }
        }

        var response = new { user.Id, user.Email };
        return ServiceResult<object>.Ok(response);
    }

    public async Task<ServiceResult<bool>> DeleteUserAsync(string id, string currentUserId)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return ServiceResult<bool>.Fail("Không tìm thấy người dùng");
        }

        // Không cho xóa chính mình
        if (currentUserId == user.Id)
        {
            return ServiceResult<bool>.Fail("Bạn không thể xóa tài khoản của chính mình");
        }

        var deleteResult = await _userManager.DeleteAsync(user);
        if (!deleteResult.Succeeded)
        {
            var errorMessages = deleteResult.Errors.Select(e => e.Description).ToList();
            return ServiceResult<bool>.Fail(errorMessages);
        }

        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<List<UserListItemDto>>> GetUsersAsync()
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

        return ServiceResult<List<UserListItemDto>>.Ok(result);
    }

    public async Task<ServiceResult<UserListItemDto>> GetUserByIdAsync(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return ServiceResult<UserListItemDto>.Fail("Không tìm thấy người dùng");
        }

        var roles = await _userManager.GetRolesAsync(user);

        var userDto = new UserListItemDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Roles = roles
        };

        return ServiceResult<UserListItemDto>.Ok(userDto);
    }

    public async Task<ServiceResult<bool>> UpdateUserRolesAsync(string id, UpdateUserRolesDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return ServiceResult<bool>.Fail("Không tìm thấy người dùng");
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
                return ServiceResult<bool>.Fail($"Vai trò '{role}' không hợp lệ");
            }
        }

        var rolesToRemove = currentRoles.Where(r => !normalizedNewRoles.Contains(r)).ToList();
        var rolesToAdd = normalizedNewRoles.Where(r => !currentRoles.Contains(r)).ToList();

        if (rolesToRemove.Any())
        {
            var removeResult = await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
            if (!removeResult.Succeeded)
            {
                var errorMessages = removeResult.Errors.Select(e => e.Description).ToList();
                return ServiceResult<bool>.Fail(errorMessages);
            }
        }

        if (rolesToAdd.Any())
        {
            var addResult = await _userManager.AddToRolesAsync(user, rolesToAdd);
            if (!addResult.Succeeded)
            {
                var errorMessages = addResult.Errors.Select(e => e.Description).ToList();
                return ServiceResult<bool>.Fail(errorMessages);
            }
        }

        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<bool>> UpdateUserStatusAsync(string id, UpdateUserStatusDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return ServiceResult<bool>.Fail("Không tìm thấy người dùng");
        }

        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            var errorMessages = result.Errors.Select(e => e.Description).ToList();
            return ServiceResult<bool>.Fail(errorMessages);
        }

        return ServiceResult<bool>.Ok(true);
    }
}
