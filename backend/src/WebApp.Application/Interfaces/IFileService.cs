using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Files;
using WebApp.Core.Entities;

namespace WebApp.Application.Interfaces;

public interface IFileService
{
    Task<FileMetadata> UploadFileAsync(Stream fileStream, string fileName, string contentType, string userId);
    Task<Stream?> DownloadFileAsync(Guid fileId);
    Task<bool> DeleteFileAsync(Guid fileId);
    Task<FileMetadata?> GetFileMetadataAsync(Guid fileId);
    Task<IEnumerable<FileMetadata>> GetUserFilesAsync(string userId, FileType? fileType = null);
    FileType GetFileTypeFromContentType(string contentType);
    bool IsValidFileType(string contentType);
    long GetMaxFileSize();
    Task<ServiceResult<bool>> MoveFileAsync(Guid fileId, Guid? folderId, string userId);
    Task<ServiceResult<FileMetadata>> CreateFileFromChunkedUploadAsync(string filePath, string fileName, string contentType, long fileSize, string? description, Guid? folderId, string userId);
}
