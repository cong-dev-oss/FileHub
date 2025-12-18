using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Files;

namespace WebApp.Application.Interfaces;

public interface IFolderService
{
    Task<ServiceResult<List<FolderDto>>> GetFolderTreeAsync(string userId);
    Task<ServiceResult<List<FolderDto>>> GetFoldersAsync(string userId, Guid? parentId = null);
    Task<ServiceResult<FolderDto>> CreateFolderAsync(CreateFolderDto dto, string userId);
    Task<ServiceResult<bool>> UpdateFolderAsync(Guid id, UpdateFolderDto dto, string userId);
    Task<ServiceResult<bool>> DeleteFolderAsync(Guid id, string userId);
}
