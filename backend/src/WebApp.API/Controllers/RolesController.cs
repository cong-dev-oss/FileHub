using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApp.API.Extensions;
using WebApp.Application.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")] // Chỉ Admin mặc định được quản lý nhóm quyền
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles()
    {
        var result = await _roleService.GetRolesAsync();
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Lỗi không xác định", "GET_ROLES_FAILED");
        }

        return this.OkResponse(result.Data!, "Lấy danh sách vai trò thành công");
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] string roleName)
    {
        var result = await _roleService.CreateRoleAsync(roleName);
        if (!result.Success)
        {
            if (result.Errors != null && result.Errors.Any())
            {
                var errors = new Dictionary<string, string[]> { { "General", result.Errors.ToArray() } };
                return this.BadRequestResponse(result.ErrorMessage ?? "Tạo vai trò thất bại", errors, "CREATE_ROLE_FAILED");
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Tạo vai trò thất bại", "CREATE_ROLE_FAILED");
        }

        return this.OkResponse("Tạo vai trò thành công");
    }

    [HttpDelete("{roleId}")]
    public async Task<IActionResult> DeleteRole(string roleId)
    {
        var result = await _roleService.DeleteRoleAsync(roleId);
        if (!result.Success)
        {
            if (result.Errors != null && result.Errors.Any())
            {
                var errors = new Dictionary<string, string[]> { { "General", result.Errors.ToArray() } };
                return this.BadRequestResponse(result.ErrorMessage ?? "Xóa vai trò thất bại", errors, "DELETE_ROLE_FAILED");
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Xóa vai trò thất bại", "DELETE_ROLE_FAILED");
        }

        return this.NoContentResponse();
    }

    /// <summary>
    /// Lấy danh sách permission gán cho một role.
    /// </summary>
    [HttpGet("{roleId}/permissions")]
    public async Task<IActionResult> GetRolePermissions(string roleId)
    {
        var result = await _roleService.GetRolePermissionsAsync(roleId);
        if (!result.Success)
        {
            return this.NotFoundResponse(result.ErrorMessage ?? "Không tìm thấy vai trò");
        }

        return this.OkResponse(result.Data!, "Lấy danh sách quyền của vai trò thành công");
    }

    /// <summary>
    /// Gán danh sách permission code cho một role (ghi đè).
    /// </summary>
    [HttpPost("{roleId}/permissions")]
    public async Task<IActionResult> SetRolePermissions(string roleId, [FromBody] List<string> permissionCodes)
    {
        var result = await _roleService.SetRolePermissionsAsync(roleId, permissionCodes);
        if (!result.Success)
        {
            return this.NotFoundResponse(result.ErrorMessage ?? "Không tìm thấy vai trò");
        }

        return this.OkResponse("Gán quyền cho vai trò thành công");
    }
}


