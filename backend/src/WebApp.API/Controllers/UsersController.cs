using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApp.API.Extensions;
using WebApp.Application.DTOs.Users;
using WebApp.Application.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Tạo user mới (Admin tạo, không phải tự đăng ký).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _userService.CreateUserAsync(dto, currentUserId);
        if (!result.Success)
        {
            if (result.Errors != null && result.Errors.Any())
            {
                var errors = new Dictionary<string, string[]> { { "General", result.Errors.ToArray() } };
                return this.BadRequestResponse(result.ErrorMessage ?? "Tạo người dùng thất bại", errors, "CREATE_USER_FAILED");
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Tạo người dùng thất bại", "CREATE_USER_FAILED");
        }

        return this.CreatedResponse(nameof(GetUserById), new { id = ((dynamic)result.Data!).Id }, result.Data!, "Tạo người dùng thành công");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _userService.DeleteUserAsync(id, currentUserId);
        if (!result.Success)
        {
            if (result.Errors != null && result.Errors.Any())
            {
                var errors = new Dictionary<string, string[]> { { "General", result.Errors.ToArray() } };
                return this.BadRequestResponse(result.ErrorMessage ?? "Xóa người dùng thất bại", errors, "DELETE_USER_FAILED");
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Xóa người dùng thất bại", "DELETE_USER_FAILED");
        }

        return this.NoContentResponse();
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var result = await _userService.GetUsersAsync();
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Lỗi không xác định", "GET_USERS_FAILED");
        }

        return this.OkResponse(result.Data!, "Lấy danh sách người dùng thành công");
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(string id)
    {
        var result = await _userService.GetUserByIdAsync(id);
        if (!result.Success)
        {
            return this.NotFoundResponse(result.ErrorMessage ?? "Không tìm thấy người dùng");
        }

        return this.OkResponse(result.Data!, "Lấy thông tin người dùng thành công");
    }

    [HttpPut("{id}/roles")]
    public async Task<IActionResult> UpdateUserRoles(string id, [FromBody] UpdateUserRolesDto dto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var result = await _userService.UpdateUserRolesAsync(id, dto);
        if (!result.Success)
        {
            if (result.Errors != null && result.Errors.Any())
            {
                var errors = new Dictionary<string, string[]> { { "General", result.Errors.ToArray() } };
                return this.BadRequestResponse(result.ErrorMessage ?? "Cập nhật vai trò thất bại", errors, "UPDATE_USER_ROLES_FAILED");
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Cập nhật vai trò thất bại", "UPDATE_USER_ROLES_FAILED");
        }

        return this.NoContentResponse();
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] UpdateUserStatusDto dto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var result = await _userService.UpdateUserStatusAsync(id, dto);
        if (!result.Success)
        {
            if (result.Errors != null && result.Errors.Any())
            {
                var errors = new Dictionary<string, string[]> { { "General", result.Errors.ToArray() } };
                return this.BadRequestResponse(result.ErrorMessage ?? "Cập nhật trạng thái người dùng thất bại", errors, "UPDATE_USER_STATUS_FAILED");
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Cập nhật trạng thái người dùng thất bại", "UPDATE_USER_STATUS_FAILED");
        }

        return this.NoContentResponse();
    }
}


