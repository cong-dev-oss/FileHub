using System.Security.Claims;
using System.Text.RegularExpressions;
using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Content;
using WebApp.Application.Interfaces;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;

namespace WebApp.Infrastructure.Services;

public class ContentService : IContentService
{
    private readonly IUnitOfWork _unitOfWork;

    public ContentService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ServiceResult<IEnumerable<ContentDto>>> GetContentsAsync(string userId, string? contentType = null, string? status = null)
    {
        try
        {
            var contents = await _unitOfWork.Contents.FindAsync(c => 
                c.UserId == userId && 
                !c.IsDeleted &&
                (contentType == null || c.ContentType.ToString() == contentType) &&
                (status == null || c.Status.ToString() == status));

            var contentsList = contents.ToList();
            var allContentFiles = await _unitOfWork.ContentFiles.FindAsync(cf => 
                contentsList.Select(c => c.Id).Contains(cf.ContentId));
            
            var contentFilesDict = allContentFiles
                .GroupBy(cf => cf.ContentId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var response = contentsList.Select(c => MapToDto(c, contentFilesDict))
                .OrderByDescending(c => c.CreatedAt);
            
            return ServiceResult<IEnumerable<ContentDto>>.Ok(response);
        }
        catch (Exception ex)
        {
            return ServiceResult<IEnumerable<ContentDto>>.Fail($"Error retrieving contents: {ex.Message}");
        }
    }

    public async Task<ServiceResult<ContentDto>> GetContentByIdAsync(Guid id, string userId)
    {
        try
        {
            var content = await _unitOfWork.Contents.GetByIdAsync(id);
            if (content == null || content.IsDeleted || content.UserId != userId)
            {
                return ServiceResult<ContentDto>.Fail("Content not found");
            }

            var contentFiles = await _unitOfWork.ContentFiles.FindAsync(cf => cf.ContentId == id);
            var contentFilesDict = new Dictionary<Guid, List<ContentFile>> 
            { 
                { id, contentFiles.ToList() } 
            };

            var response = MapToDto(content, contentFilesDict);
            return ServiceResult<ContentDto>.Ok(response);
        }
        catch (Exception ex)
        {
            return ServiceResult<ContentDto>.Fail($"Error retrieving content: {ex.Message}");
        }
    }

    public async Task<ServiceResult<ContentDto>> CreateContentAsync(CreateContentDto createDto, string userId)
    {
        try
        {
            // Validation
            if (!Enum.TryParse<ContentType>(createDto.ContentType, true, out var contentType))
            {
                return ServiceResult<ContentDto>.Fail("Invalid content type");
            }

            if (!Enum.TryParse<ContentStatus>(createDto.Status, true, out var status))
            {
                status = ContentStatus.Draft;
            }

            // Generate unique slug
            var slug = await GenerateUniqueSlugAsync(createDto.Title);

            // Create content entity
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
                await AssociateFilesToContentAsync(content.Id, createDto.FileIds, userId);
                await _unitOfWork.SaveChangesAsync();
            }

            var contentFiles = await _unitOfWork.ContentFiles.FindAsync(cf => cf.ContentId == content.Id);
            var contentFilesDict = new Dictionary<Guid, List<ContentFile>> 
            { 
                { content.Id, contentFiles.ToList() } 
            };

            var response = MapToDto(content, contentFilesDict);
            return ServiceResult<ContentDto>.Ok(response);
        }
        catch (Exception ex)
        {
            return ServiceResult<ContentDto>.Fail($"Error creating content: {ex.Message}");
        }
    }

    public async Task<ServiceResult<ContentDto>> UpdateContentAsync(Guid id, UpdateContentDto updateDto, string userId)
    {
        try
        {
            var content = await _unitOfWork.Contents.GetByIdAsync(id);
            if (content == null || content.IsDeleted || content.UserId != userId)
            {
                return ServiceResult<ContentDto>.Fail("Content not found");
            }

            content.Title = updateDto.Title;
            content.Description = updateDto.Description;
            content.Body = updateDto.Body;
            content.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(updateDto.Status) && 
                Enum.TryParse<ContentStatus>(updateDto.Status, true, out var status))
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
                await UpdateContentFilesAsync(id, updateDto.FileIds, userId);
            }

            await _unitOfWork.Contents.UpdateAsync(content);
            await _unitOfWork.SaveChangesAsync();

            var contentFiles = await _unitOfWork.ContentFiles.FindAsync(cf => cf.ContentId == id);
            var contentFilesDict = new Dictionary<Guid, List<ContentFile>> 
            { 
                { id, contentFiles.ToList() } 
            };

            var response = MapToDto(content, contentFilesDict);
            return ServiceResult<ContentDto>.Ok(response);
        }
        catch (Exception ex)
        {
            return ServiceResult<ContentDto>.Fail($"Error updating content: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> DeleteContentAsync(Guid id, string userId)
    {
        try
        {
            var content = await _unitOfWork.Contents.GetByIdAsync(id);
            if (content == null || content.IsDeleted || content.UserId != userId)
            {
                return ServiceResult<bool>.Fail("Content not found");
            }

            content.IsDeleted = true;
            content.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.Contents.UpdateAsync(content);
            await _unitOfWork.SaveChangesAsync();

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error deleting content: {ex.Message}");
        }
    }

    // Private helper methods - Business logic được tách riêng
    private async Task<string> GenerateUniqueSlugAsync(string title)
    {
        var slug = GenerateSlug(title);
        var existingContent = await _unitOfWork.Contents.FirstOrDefaultAsync(c => c.Slug == slug);
        
        if (existingContent != null)
        {
            slug = $"{slug}-{Guid.NewGuid().ToString().Substring(0, 8)}";
        }
        
        return slug;
    }

    private string GenerateSlug(string title)
    {
        var slug = title.ToLower();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", " ").Trim();
        slug = Regex.Replace(slug, @"\s", "-");
        return slug;
    }

    private async Task AssociateFilesToContentAsync(Guid contentId, List<Guid> fileIds, string userId)
    {
        foreach (var fileId in fileIds)
        {
            var fileMetadata = await _unitOfWork.Files.GetByIdAsync(fileId);
            if (fileMetadata != null && fileMetadata.UserId == userId)
            {
                var contentFile = new ContentFile
                {
                    ContentId = contentId,
                    FileMetadataId = fileId,
                    DisplayOrder = 0
                };
                await _unitOfWork.ContentFiles.AddAsync(contentFile);
            }
        }
    }

    private async Task UpdateContentFilesAsync(Guid contentId, List<Guid> fileIds, string userId)
    {
        var existingContentFiles = await _unitOfWork.ContentFiles.FindAsync(cf => cf.ContentId == contentId);
        foreach (var existingFile in existingContentFiles)
        {
            await _unitOfWork.ContentFiles.DeleteAsync(existingFile);
        }

        foreach (var fileId in fileIds)
        {
            var fileMetadata = await _unitOfWork.Files.GetByIdAsync(fileId);
            if (fileMetadata != null && fileMetadata.UserId == userId)
            {
                var contentFile = new ContentFile
                {
                    ContentId = contentId,
                    FileMetadataId = fileId,
                    DisplayOrder = 0
                };
                await _unitOfWork.ContentFiles.AddAsync(contentFile);
            }
        }
    }

    private ContentDto MapToDto(Content content, Dictionary<Guid, List<ContentFile>> contentFilesDict)
    {
        return new ContentDto
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
            FileIds = contentFilesDict.ContainsKey(content.Id)
                ? contentFilesDict[content.Id].Select(cf => cf.FileMetadataId).ToList()
                : new List<Guid>()
        };
    }
}
