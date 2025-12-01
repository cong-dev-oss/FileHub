using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApp.Core.DTOs.Files;
using WebApp.Core.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IFileService _fileService;
    private readonly IUnitOfWork _unitOfWork;

    public FilesController(IFileService fileService, IUnitOfWork unitOfWork)
    {
        _fileService = fileService;
        _unitOfWork = unitOfWork;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file, [FromForm] string? description = null)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        try
        {
            if (!_fileService.IsValidFileType(file.ContentType))
            {
                return BadRequest(new { message = "Invalid file type" });
            }

            if (file.Length > _fileService.GetMaxFileSize())
            {
                return BadRequest(new { message = $"File size exceeds maximum allowed size of {_fileService.GetMaxFileSize() / (1024 * 1024)}MB" });
            }

            using var stream = file.OpenReadStream();
            var fileMetadata = await _fileService.UploadFileAsync(stream, file.FileName, file.ContentType, userId);

            var response = new FileResponseDto
            {
                Id = fileMetadata.Id,
                FileName = fileMetadata.FileName,
                OriginalFileName = fileMetadata.OriginalFileName,
                ContentType = fileMetadata.ContentType,
                FileSize = fileMetadata.FileSize,
                FileType = fileMetadata.FileType.ToString(),
                Description = fileMetadata.Description,
                CreatedAt = fileMetadata.CreatedAt,
                DownloadUrl = $"/api/files/{fileMetadata.Id}/download"
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> DownloadFile(Guid id)
    {
        var fileMetadata = await _fileService.GetFileMetadataAsync(id);
        if (fileMetadata == null || fileMetadata.IsDeleted)
        {
            return NotFound();
        }

        var stream = await _fileService.DownloadFileAsync(id);
        if (stream == null)
        {
            return NotFound();
        }

        return File(stream, fileMetadata.ContentType, fileMetadata.OriginalFileName);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetFile(Guid id)
    {
        var fileMetadata = await _fileService.GetFileMetadataAsync(id);
        if (fileMetadata == null || fileMetadata.IsDeleted)
        {
            return NotFound();
        }

        var response = new FileResponseDto
        {
            Id = fileMetadata.Id,
            FileName = fileMetadata.FileName,
            OriginalFileName = fileMetadata.OriginalFileName,
            ContentType = fileMetadata.ContentType,
            FileSize = fileMetadata.FileSize,
            FileType = fileMetadata.FileType.ToString(),
            Description = fileMetadata.Description,
            CreatedAt = fileMetadata.CreatedAt,
            DownloadUrl = $"/api/files/{fileMetadata.Id}/download"
        };

        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetFiles([FromQuery] string? fileType = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        Core.Entities.FileType? type = null;
        if (!string.IsNullOrEmpty(fileType) && Enum.TryParse<Core.Entities.FileType>(fileType, true, out var parsedType))
        {
            type = parsedType;
        }

        var files = await _fileService.GetUserFilesAsync(userId, type);
        var filesList = files.ToList();
        
        var response = filesList.Select(f => new FileResponseDto
        {
            Id = f.Id,
            FileName = f.FileName,
            OriginalFileName = f.OriginalFileName,
            ContentType = f.ContentType,
            FileSize = f.FileSize,
            FileType = f.FileType.ToString(),
            Description = f.Description,
            CreatedAt = f.CreatedAt,
            DownloadUrl = $"/api/files/{f.Id}/download"
        }).ToList();

        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFile(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var fileMetadata = await _fileService.GetFileMetadataAsync(id);
        if (fileMetadata == null || fileMetadata.IsDeleted)
        {
            return NotFound();
        }

        if (fileMetadata.UserId != userId)
        {
            return Forbid();
        }

        var result = await _fileService.DeleteFileAsync(id);
        if (!result)
        {
            return NotFound();
        }

        return NoContent();
    }
}

