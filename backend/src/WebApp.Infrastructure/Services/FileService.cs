using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;

namespace WebApp.Infrastructure.Services;

public class FileService : IFileService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IWebHostEnvironment _environment;
    private readonly string _uploadsPath;
    private const long MaxFileSize = 5L * 1024 * 1024 * 1024; // 5GB

    private static readonly Dictionary<string, FileType> ContentTypeMap = new()
    {
        // Documents
        { "application/pdf", FileType.Document },
        { "application/msword", FileType.Document },
        { "application/vnd.openxmlformats-officedocument.wordprocessingml.document", FileType.Document },
        { "application/vnd.ms-word.document.macroEnabled.12", FileType.Document },
        { "application/rtf", FileType.Document },
        { "text/plain", FileType.Document },
        
        // Spreadsheets
        { "application/vnd.ms-excel", FileType.Spreadsheet },
        { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", FileType.Spreadsheet },
        { "application/vnd.ms-excel.sheet.macroEnabled.12", FileType.Spreadsheet },
        { "text/csv", FileType.Spreadsheet },
        
        // Videos - Common formats
        { "video/mp4", FileType.Video },
        { "video/mpeg", FileType.Video },
        { "video/quicktime", FileType.Video }, // .mov files
        { "video/x-msvideo", FileType.Video }, // .avi files
        { "video/x-ms-wmv", FileType.Video }, // .wmv files
        { "video/webm", FileType.Video },
        { "video/x-matroska", FileType.Video }, // .mkv files
        { "video/x-flv", FileType.Video }, // .flv files
        { "video/3gpp", FileType.Video }, // .3gp files
        { "video/x-ms-asf", FileType.Video }, // .asf files
        
        // Images
        { "image/jpeg", FileType.Image },
        { "image/png", FileType.Image },
        { "image/gif", FileType.Image },
        { "image/webp", FileType.Image },
        { "image/svg+xml", FileType.Image },
        
        // Audio
        { "audio/mpeg", FileType.Audio },
        { "audio/wav", FileType.Audio },
        { "audio/ogg", FileType.Audio },
        { "audio/webm", FileType.Audio }
    };

    public FileService(IUnitOfWork unitOfWork, IWebHostEnvironment environment)
    {
        _unitOfWork = unitOfWork;
        _environment = environment;
        _uploadsPath = Path.Combine(_environment.ContentRootPath, "Uploads");
        
        if (!Directory.Exists(_uploadsPath))
        {
            Directory.CreateDirectory(_uploadsPath);
        }
    }

    public async Task<FileMetadata> UploadFileAsync(Stream fileStream, string fileName, string contentType, string userId)
    {
        if (!IsValidFileType(contentType))
        {
            throw new ArgumentException($"File type {contentType} is not allowed");
        }

        var fileType = GetFileTypeFromContentType(contentType);
        var fileExtension = Path.GetExtension(fileName);
        var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
        var year = DateTime.UtcNow.Year;
        var month = DateTime.UtcNow.Month.ToString("00");
        var typeFolder = fileType.ToString().ToLower();
        var fileDirectory = Path.Combine(_uploadsPath, typeFolder, year.ToString(), month);
        
        if (!Directory.Exists(fileDirectory))
        {
            Directory.CreateDirectory(fileDirectory);
        }

        var filePath = Path.Combine(fileDirectory, uniqueFileName);
        var fileSize = fileStream.Length;

        if (fileSize > MaxFileSize)
        {
            throw new ArgumentException($"File size exceeds maximum allowed size of {MaxFileSize / (1024L * 1024 * 1024)}GB");
        }

        // Use buffered stream for better performance with large files
        using (var fileStreamWriter = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            await fileStream.CopyToAsync(fileStreamWriter, 81920); // 80KB buffer for better performance
        }

        var fileMetadata = new FileMetadata
        {
            FileName = uniqueFileName,
            OriginalFileName = fileName,
            FilePath = filePath,
            ContentType = contentType,
            FileSize = fileSize,
            FileType = fileType,
            UserId = userId,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Files.AddAsync(fileMetadata);
        await _unitOfWork.SaveChangesAsync();

        return fileMetadata;
    }

    public async Task<Stream?> DownloadFileAsync(Guid fileId)
    {
        var fileMetadata = await _unitOfWork.Files.GetByIdAsync(fileId);
        
        if (fileMetadata == null || fileMetadata.IsDeleted || !File.Exists(fileMetadata.FilePath))
        {
            return null;
        }

        return new FileStream(fileMetadata.FilePath, FileMode.Open, FileAccess.Read);
    }

    public async Task<bool> DeleteFileAsync(Guid fileId)
    {
        var fileMetadata = await _unitOfWork.Files.GetByIdAsync(fileId);
        
        if (fileMetadata == null || fileMetadata.IsDeleted)
        {
            return false;
        }

        if (File.Exists(fileMetadata.FilePath))
        {
            File.Delete(fileMetadata.FilePath);
        }

        fileMetadata.IsDeleted = true;
        fileMetadata.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.Files.UpdateAsync(fileMetadata);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<FileMetadata?> GetFileMetadataAsync(Guid fileId)
    {
        return await _unitOfWork.Files.GetByIdAsync(fileId);
    }

    public async Task<IEnumerable<FileMetadata>> GetUserFilesAsync(string userId, FileType? fileType = null)
    {
        var files = await _unitOfWork.Files.FindAsync(f => 
            f.UserId == userId && 
            !f.IsDeleted &&
            (fileType == null || f.FileType == fileType));
        
        return files.OrderByDescending(f => f.CreatedAt);
    }

    public FileType GetFileTypeFromContentType(string contentType)
    {
        if (ContentTypeMap.TryGetValue(contentType.ToLower(), out var fileType))
        {
            return fileType;
        }
        return FileType.Other;
    }

    public bool IsValidFileType(string contentType)
    {
        return ContentTypeMap.ContainsKey(contentType.ToLower()) || 
               contentType.StartsWith("image/") || 
               contentType.StartsWith("video/") || 
               contentType.StartsWith("audio/");
    }

    public long GetMaxFileSize()
    {
        return MaxFileSize;
    }
}

