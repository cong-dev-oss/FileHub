using WebApp.Core.Entities;

namespace WebApp.Core.Interfaces;

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
}

