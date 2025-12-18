using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Content;

namespace WebApp.Application.Interfaces;

public interface IContentService
{
    Task<ServiceResult<IEnumerable<ContentDto>>> GetContentsAsync(string userId, string? contentType = null, string? status = null);
    Task<ServiceResult<ContentDto>> GetContentByIdAsync(Guid id, string userId);
    Task<ServiceResult<ContentDto>> CreateContentAsync(CreateContentDto createDto, string userId);
    Task<ServiceResult<ContentDto>> UpdateContentAsync(Guid id, UpdateContentDto updateDto, string userId);
    Task<ServiceResult<bool>> DeleteContentAsync(Guid id, string userId);
}
