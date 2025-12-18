using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApp.API.Extensions;
using WebApp.Application.Interfaces;
using WebApp.Core.Entities;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")] // Chỉ Admin được quản lý quyền chi tiết
public class PermissionsController : ControllerBase
{
    private readonly IPermissionService _permissionService;

    public PermissionsController(IPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPermissions()
    {
        var result = await _permissionService.GetPermissionsAsync();
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Lỗi không xác định", "GET_PERMISSIONS_FAILED");
        }

        return this.OkResponse(result.Data!, "Lấy danh sách quyền thành công");
    }

    [HttpPost]
    public async Task<IActionResult> CreatePermission([FromBody] Permission permission)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var result = await _permissionService.CreatePermissionAsync(permission);
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Tạo quyền thất bại", "CREATE_PERMISSION_FAILED");
        }

        return this.OkResponse(result.Data!, "Tạo quyền thành công");
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdatePermission(int id, [FromBody] Permission permission)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var result = await _permissionService.UpdatePermissionAsync(id, permission);
        if (!result.Success)
        {
            return this.NotFoundResponse(result.ErrorMessage ?? "Không tìm thấy quyền");
        }

        return this.OkResponse(result.Data!, "Cập nhật quyền thành công");
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePermission(int id)
    {
        var result = await _permissionService.DeletePermissionAsync(id);
        if (!result.Success)
        {
            return this.NotFoundResponse(result.ErrorMessage ?? "Không tìm thấy quyền");
        }

        return this.NoContentResponse();
    }
}


