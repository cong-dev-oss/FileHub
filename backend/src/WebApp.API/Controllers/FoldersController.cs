using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApp.API.Extensions;
using WebApp.Application.DTOs.Files;
using WebApp.Application.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FoldersController : ControllerBase
{
    private readonly IFolderService _folderService;

    public FoldersController(IFolderService folderService)
    {
        _folderService = folderService;
    }

    [HttpGet("tree")]
    public async Task<IActionResult> GetFolderTree()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _folderService.GetFolderTreeAsync(userId);
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Lỗi không xác định", "GET_FOLDER_TREE_FAILED");
        }

        return this.OkResponse(result.Data!, "Lấy cây thư mục thành công");
    }

    [HttpGet]
    public async Task<IActionResult> GetFolders([FromQuery] Guid? parentId = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _folderService.GetFoldersAsync(userId, parentId);
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Lỗi không xác định", "GET_FOLDERS_FAILED");
        }

        return this.OkResponse(result.Data!, "Lấy danh sách thư mục thành công");
    }

    [HttpPost]
    public async Task<IActionResult> CreateFolder([FromBody] CreateFolderDto dto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _folderService.CreateFolderAsync(dto, userId);
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Tạo thư mục thất bại", "CREATE_FOLDER_FAILED");
        }

        return this.CreatedResponse(nameof(GetFolders), new { parentId = result.Data!.ParentId }, result.Data, "Tạo thư mục thành công");
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateFolder(Guid id, [FromBody] UpdateFolderDto dto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _folderService.UpdateFolderAsync(id, dto, userId);
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Cập nhật thư mục thất bại", "UPDATE_FOLDER_FAILED");
        }

        return this.NoContentResponse();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFolder(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _folderService.DeleteFolderAsync(id, userId);
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Xóa thư mục thất bại", "DELETE_FOLDER_FAILED");
        }

        return this.NoContentResponse();
    }
}









