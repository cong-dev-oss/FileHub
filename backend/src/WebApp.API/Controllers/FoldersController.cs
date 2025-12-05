using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApp.Core.DTOs.Files;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FoldersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public FoldersController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet("tree")]
    public async Task<IActionResult> GetFolderTree()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

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

        return Ok(roots);
    }

    [HttpGet]
    public async Task<IActionResult> GetFolders([FromQuery] Guid? parentId = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

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

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateFolder([FromBody] CreateFolderDto dto)
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

        Folder? parent = null;
        if (dto.ParentId.HasValue)
        {
            parent = await _unitOfWork.Folders.GetByIdAsync(dto.ParentId.Value);
            if (parent == null || parent.IsDeleted || parent.UserId != userId)
            {
                return BadRequest(new { message = "Parent folder not found" });
            }
        }

        var folder = new Folder
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

        return CreatedAtAction(nameof(GetFolders), new { parentId = folder.ParentId }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateFolder(Guid id, [FromBody] UpdateFolderDto dto)
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

        var folder = await _unitOfWork.Folders.GetByIdAsync(id);
        if (folder == null || folder.IsDeleted || folder.UserId != userId)
        {
            return NotFound();
        }

        if (dto.ParentId.HasValue)
        {
            if (dto.ParentId.Value == id)
            {
                return BadRequest(new { message = "Folder cannot be its own parent" });
            }

            var parent = await _unitOfWork.Folders.GetByIdAsync(dto.ParentId.Value);
            if (parent == null || parent.IsDeleted || parent.UserId != userId)
            {
                return BadRequest(new { message = "Parent folder not found" });
            }
        }

        folder.Name = dto.Name;
        folder.ParentId = dto.ParentId;
        folder.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Folders.UpdateAsync(folder);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFolder(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var folder = await _unitOfWork.Folders.GetByIdAsync(id);
        if (folder == null || folder.IsDeleted || folder.UserId != userId)
        {
            return NotFound();
        }

        // Check if folder has children
        var children = await _unitOfWork.Folders.FindAsync(f => f.ParentId == id && !f.IsDeleted);
        if (children.Any())
        {
            return BadRequest(new { message = "Cannot delete folder that contains subfolders. Please delete or move subfolders first." });
        }

        // Check if folder has files
        var files = await _unitOfWork.Files.FindAsync(f => f.FolderId == id && !f.IsDeleted);
        if (files.Any())
        {
            return BadRequest(new { message = "Cannot delete folder that contains files. Please delete or move files first." });
        }

        folder.IsDeleted = true;
        folder.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.Folders.UpdateAsync(folder);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }
}

