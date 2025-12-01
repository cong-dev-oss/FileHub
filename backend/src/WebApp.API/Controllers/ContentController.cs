using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApp.Core.DTOs.Content;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContentController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public ContentController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetContents([FromQuery] string? contentType = null, [FromQuery] string? status = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var contents = await _unitOfWork.Contents.FindAsync(c => 
            c.UserId == userId && 
            !c.IsDeleted &&
            (contentType == null || c.ContentType.ToString() == contentType) &&
            (status == null || c.Status.ToString() == status));

        // Load navigation properties for each content
        var contentsList = contents.ToList();
        var allContentFiles = await _unitOfWork.ContentFiles.FindAsync(cf => contentsList.Select(c => c.Id).Contains(cf.ContentId));
        var contentFilesDict = allContentFiles.GroupBy(cf => cf.ContentId).ToDictionary(g => g.Key, g => g.ToList());

        var response = contentsList.Select(c => new ContentDto
        {
            Id = c.Id,
            Title = c.Title,
            Slug = c.Slug,
            Description = c.Description,
            Body = c.Body,
            ContentType = c.ContentType.ToString(),
            Status = c.Status.ToString(),
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            PublishedAt = c.PublishedAt,
            CreatedBy = c.CreatedBy,
            FileIds = contentFilesDict.ContainsKey(c.Id) 
                ? contentFilesDict[c.Id].Select(cf => cf.FileMetadataId).ToList() 
                : new List<Guid>()
        }).OrderByDescending(c => c.CreatedAt).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetContent(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var content = await _unitOfWork.Contents.GetByIdAsync(id);
        if (content == null || content.IsDeleted || content.UserId != userId)
        {
            return NotFound();
        }

        // Load navigation properties
        if (content.ContentFiles == null || !content.ContentFiles.Any())
        {
            var contentFiles = await _unitOfWork.ContentFiles.FindAsync(cf => cf.ContentId == id);
            content.ContentFiles = contentFiles.ToList();
        }

        var response = new ContentDto
        {
            Id = content.Id,
            Title = content.Title,
            Slug = content.Slug,
            Description = content.Description,
            Body = content.Body,
            ContentType = content.ContentType.ToString(),
            Status = content.Status.ToString(),
            CreatedAt = content.CreatedAt,
            UpdatedAt = content.UpdatedAt,
            PublishedAt = content.PublishedAt,
            CreatedBy = content.CreatedBy,
            FileIds = content.ContentFiles?.Select(cf => cf.FileMetadataId).ToList() ?? new List<Guid>()
        };

        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> CreateContent([FromBody] CreateContentDto createDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        if (!Enum.TryParse<ContentType>(createDto.ContentType, true, out var contentType))
        {
            return BadRequest(new { message = "Invalid content type" });
        }

        if (!Enum.TryParse<ContentStatus>(createDto.Status, true, out var status))
        {
            status = ContentStatus.Draft;
        }

        var slug = GenerateSlug(createDto.Title);
        var existingContent = await _unitOfWork.Contents.FirstOrDefaultAsync(c => c.Slug == slug);
        if (existingContent != null)
        {
            slug = $"{slug}-{Guid.NewGuid().ToString().Substring(0, 8)}";
        }

        var content = new Content
        {
            Title = createDto.Title,
            Slug = slug,
            Description = createDto.Description,
            Body = createDto.Body,
            ContentType = contentType,
            Status = status,
            UserId = userId,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        if (status == ContentStatus.Published)
        {
            content.PublishedAt = DateTime.UtcNow;
        }

        await _unitOfWork.Contents.AddAsync(content);
        await _unitOfWork.SaveChangesAsync();

        // Associate files if provided
        if (createDto.FileIds != null && createDto.FileIds.Any())
        {
            foreach (var fileId in createDto.FileIds)
            {
                var fileMetadata = await _unitOfWork.Files.GetByIdAsync(fileId);
                if (fileMetadata != null && fileMetadata.UserId == userId)
                {
                    var contentFile = new ContentFile
                    {
                        ContentId = content.Id,
                        FileMetadataId = fileId,
                        DisplayOrder = 0
                    };
                    await _unitOfWork.ContentFiles.AddAsync(contentFile);
                }
            }
            await _unitOfWork.SaveChangesAsync();
        }

        var response = new ContentDto
        {
            Id = content.Id,
            Title = content.Title,
            Slug = content.Slug,
            Description = content.Description,
            Body = content.Body,
            ContentType = content.ContentType.ToString(),
            Status = content.Status.ToString(),
            CreatedAt = content.CreatedAt,
            UpdatedAt = content.UpdatedAt,
            PublishedAt = content.PublishedAt,
            CreatedBy = content.CreatedBy,
            FileIds = createDto.FileIds
        };

        return CreatedAtAction(nameof(GetContent), new { id = content.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateContent(Guid id, [FromBody] UpdateContentDto updateDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var content = await _unitOfWork.Contents.GetByIdAsync(id);
        if (content == null || content.IsDeleted || content.UserId != userId)
        {
            return NotFound();
        }

        content.Title = updateDto.Title;
        content.Description = updateDto.Description;
        content.Body = updateDto.Body;
        content.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(updateDto.Status) && Enum.TryParse<ContentStatus>(updateDto.Status, true, out var status))
        {
            content.Status = status;
            if (status == ContentStatus.Published && content.PublishedAt == null)
            {
                content.PublishedAt = DateTime.UtcNow;
            }
        }

        // Update associated files
        if (updateDto.FileIds != null)
        {
            var existingContentFiles = await _unitOfWork.ContentFiles.FindAsync(cf => cf.ContentId == id);
            foreach (var existingFile in existingContentFiles)
            {
                await _unitOfWork.ContentFiles.DeleteAsync(existingFile);
            }

            foreach (var fileId in updateDto.FileIds)
            {
                var fileMetadata = await _unitOfWork.Files.GetByIdAsync(fileId);
                if (fileMetadata != null && fileMetadata.UserId == userId)
                {
                    var contentFile = new ContentFile
                    {
                        ContentId = content.Id,
                        FileMetadataId = fileId,
                        DisplayOrder = 0
                    };
                    await _unitOfWork.ContentFiles.AddAsync(contentFile);
                }
            }
        }

        await _unitOfWork.Contents.UpdateAsync(content);
        await _unitOfWork.SaveChangesAsync();

        var response = new ContentDto
        {
            Id = content.Id,
            Title = content.Title,
            Slug = content.Slug,
            Description = content.Description,
            Body = content.Body,
            ContentType = content.ContentType.ToString(),
            Status = content.Status.ToString(),
            CreatedAt = content.CreatedAt,
            UpdatedAt = content.UpdatedAt,
            PublishedAt = content.PublishedAt,
            CreatedBy = content.CreatedBy,
            FileIds = updateDto.FileIds
        };

        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteContent(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var content = await _unitOfWork.Contents.GetByIdAsync(id);
        if (content == null || content.IsDeleted || content.UserId != userId)
        {
            return NotFound();
        }

        content.IsDeleted = true;
        content.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.Contents.UpdateAsync(content);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    private string GenerateSlug(string title)
    {
        var slug = title.ToLower();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", " ").Trim();
        slug = Regex.Replace(slug, @"\s", "-");
        return slug;
    }
}

