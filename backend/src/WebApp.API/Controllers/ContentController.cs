using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApp.API.Extensions;
using WebApp.Application.DTOs.Content;
using WebApp.Application.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContentController : ControllerBase
{
    private readonly IContentService _contentService;

    public ContentController(IContentService contentService)
    {
        _contentService = contentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetContents([FromQuery] string? contentType = null, [FromQuery] string? status = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _contentService.GetContentsAsync(userId, contentType, status);
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Lỗi không xác định", "GET_CONTENTS_FAILED");
        }

        return this.OkResponse(result.Data!.ToList(), "Lấy danh sách nội dung thành công");
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetContent(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _contentService.GetContentByIdAsync(id, userId);
        if (!result.Success)
        {
            return this.NotFoundResponse(result.ErrorMessage ?? "Không tìm thấy nội dung");
        }

        return this.OkResponse(result.Data!, "Lấy thông tin nội dung thành công");
    }

    [HttpPost]
    public async Task<IActionResult> CreateContent([FromBody] CreateContentDto createDto)
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

        var result = await _contentService.CreateContentAsync(createDto, userId);
        if (!result.Success)
        {
            if (result.Errors != null && result.Errors.Any())
            {
                var errors = new Dictionary<string, string[]> { { "General", result.Errors.ToArray() } };
                return this.BadRequestResponse(result.ErrorMessage ?? "Tạo nội dung thất bại", errors, "CREATE_CONTENT_FAILED");
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Tạo nội dung thất bại", "CREATE_CONTENT_FAILED");
        }

        return this.CreatedResponse(nameof(GetContent), new { id = result.Data!.Id }, result.Data, "Tạo nội dung thành công");
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateContent(Guid id, [FromBody] UpdateContentDto updateDto)
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

        var result = await _contentService.UpdateContentAsync(id, updateDto, userId);
        if (!result.Success)
        {
            if (result.Errors != null && result.Errors.Any())
            {
                var errors = new Dictionary<string, string[]> { { "General", result.Errors.ToArray() } };
                return this.BadRequestResponse(result.ErrorMessage ?? "Cập nhật nội dung thất bại", errors, "UPDATE_CONTENT_FAILED");
            }
            return this.NotFoundResponse(result.ErrorMessage ?? "Không tìm thấy nội dung");
        }

        return this.OkResponse(result.Data!, "Cập nhật nội dung thành công");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteContent(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _contentService.DeleteContentAsync(id, userId);
        if (!result.Success)
        {
            return this.NotFoundResponse(result.ErrorMessage ?? "Không tìm thấy nội dung");
        }

        return this.NoContentResponse();
    }
}

