using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Files;
using WebApp.Application.Interfaces;
using WebApp.Core.Interfaces;

namespace WebApp.Infrastructure.Services;

public class FolderService : IFolderService
{
    private readonly IUnitOfWork _unitOfWork;

    public FolderService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ServiceResult<List<FolderDto>>> GetFolderTreeAsync(string userId)
    {
        var folders = await _unitOfWork.Folders.FindAsync(f => f.UserId == userId && !f.IsDeleted);
        var list = folders.ToList();

        var lookup = list.ToDictionary(f => f.Id, f => new FolderDto
        {
            Id = f.Id,
            Name = f.Name,
            ParentId = f.ParentId,
            Children = new List<FolderDto>()
        });

        List<FolderDto> roots = new();
        foreach (var folder in list)
        {
            var dto = lookup[folder.Id];
            if (folder.ParentId.HasValue && lookup.TryGetValue(folder.ParentId.Value, out var parentDto))
            {
                parentDto.Children.Add(dto);
            }
            else
            {
                roots.Add(dto);
            }
        }

        return ServiceResult<List<FolderDto>>.Ok(roots);
    }

    public async Task<ServiceResult<List<FolderDto>>> GetFoldersAsync(string userId, Guid? parentId = null)
    {
        var folders = await _unitOfWork.Folders.FindAsync(f =>
            f.UserId == userId &&
            !f.IsDeleted &&
            f.ParentId == parentId);

        var result = folders
            .OrderBy(f => f.Name)
            .Select(f => new FolderDto
            {
                Id = f.Id,
                Name = f.Name,
                ParentId = f.ParentId,
                Children = new List<FolderDto>()
            })
            .ToList();

        return ServiceResult<List<FolderDto>>.Ok(result);
    }

    public async Task<ServiceResult<FolderDto>> CreateFolderAsync(CreateFolderDto dto, string userId)
    {
        // Validate parent folder if provided
        if (dto.ParentId.HasValue)
        {
            var parent = await _unitOfWork.Folders.GetByIdAsync(dto.ParentId.Value);
            if (parent == null || parent.IsDeleted || parent.UserId != userId)
            {
                return ServiceResult<FolderDto>.Fail("Không tìm thấy thư mục cha");
            }
        }

        var folder = new Core.Entities.Folder
        {
            Name = dto.Name,
            ParentId = dto.ParentId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Folders.AddAsync(folder);
        await _unitOfWork.SaveChangesAsync();

        var result = new FolderDto
        {
            Id = folder.Id,
            Name = folder.Name,
            ParentId = folder.ParentId,
            Children = new List<FolderDto>()
        };

        return ServiceResult<FolderDto>.Ok(result);
    }

    public async Task<ServiceResult<bool>> UpdateFolderAsync(Guid id, UpdateFolderDto dto, string userId)
    {
        var folder = await _unitOfWork.Folders.GetByIdAsync(id);
        if (folder == null || folder.IsDeleted || folder.UserId != userId)
        {
            return ServiceResult<bool>.Fail("Không tìm thấy thư mục");
        }

        // Validate parent folder
        if (dto.ParentId.HasValue)
        {
            if (dto.ParentId.Value == id)
            {
                return ServiceResult<bool>.Fail("Thư mục không thể là cha của chính nó");
            }

            var parent = await _unitOfWork.Folders.GetByIdAsync(dto.ParentId.Value);
            if (parent == null || parent.IsDeleted || parent.UserId != userId)
            {
                return ServiceResult<bool>.Fail("Không tìm thấy thư mục cha");
            }
        }

        folder.Name = dto.Name;
        folder.ParentId = dto.ParentId;
        folder.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Folders.UpdateAsync(folder);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<bool>> DeleteFolderAsync(Guid id, string userId)
    {
        var folder = await _unitOfWork.Folders.GetByIdAsync(id);
        if (folder == null || folder.IsDeleted || folder.UserId != userId)
        {
            return ServiceResult<bool>.Fail("Không tìm thấy thư mục");
        }

        // Check if folder has children
        var children = await _unitOfWork.Folders.FindAsync(f => f.ParentId == id && !f.IsDeleted);
        if (children.Any())
        {
            return ServiceResult<bool>.Fail("Không thể xóa thư mục có chứa thư mục con. Vui lòng xóa hoặc di chuyển thư mục con trước.");
        }

        // Check if folder has files
        var files = await _unitOfWork.Files.FindAsync(f => f.FolderId == id && !f.IsDeleted);
        if (files.Any())
        {
            return ServiceResult<bool>.Fail("Không thể xóa thư mục có chứa tệp. Vui lòng xóa hoặc di chuyển tệp trước.");
        }

        folder.IsDeleted = true;
        folder.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.Folders.UpdateAsync(folder);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult<bool>.Ok(true);
    }
}
