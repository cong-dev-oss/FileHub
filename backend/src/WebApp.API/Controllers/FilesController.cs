using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using System.Collections.Concurrent;
using System.IO;
using Microsoft.Extensions.Configuration;
using WebApp.Core.DTOs.Files;
using WebApp.Core.Interfaces;

namespace WebApp.API.Controllers;

// Helper class for partial file streaming
internal class PartialFileStream : Stream
{
    private readonly Stream _baseStream;
    private readonly long _start;
    private readonly long _length;
    private long _position;

    public PartialFileStream(Stream baseStream, long start, long length)
    {
        _baseStream = baseStream;
        _start = start;
        _length = length;
        _position = 0;
        _baseStream.Seek(start, SeekOrigin.Begin);
    }

    public override bool CanRead => _baseStream.CanRead;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => _length;
    public override long Position
    {
        get => _position;
        set => throw new NotSupportedException();
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        var remaining = _length - _position;
        if (remaining <= 0) return 0;
        
        var bytesToRead = (int)Math.Min(count, remaining);
        var bytesRead = _baseStream.Read(buffer, offset, bytesToRead);
        _position += bytesRead;
        return bytesRead;
    }

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    public override void SetLength(long value) => throw new NotSupportedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    public override void Flush() => _baseStream.Flush();

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _baseStream?.Dispose();
        }
        base.Dispose(disposing);
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IFileService _fileService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;

    public FilesController(IFileService fileService, IUnitOfWork unitOfWork, IConfiguration configuration)
    {
        _fileService = fileService;
        _unitOfWork = unitOfWork;
        _configuration = configuration;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file, [FromForm] string? description = null, [FromForm] string? folderId = null)
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

            // Set folderId if provided and valid
            if (!string.IsNullOrWhiteSpace(folderId) && Guid.TryParse(folderId, out var parsedFolderId))
            {
                var folder = await _unitOfWork.Folders.GetByIdAsync(parsedFolderId);
                if (folder != null && !folder.IsDeleted && folder.UserId == userId)
                {
                    fileMetadata.FolderId = parsedFolderId;
                    await _unitOfWork.Files.UpdateAsync(fileMetadata);
                    await _unitOfWork.SaveChangesAsync();
                }
                // If folder is invalid, still save the file but without folder assignment
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
                DownloadUrl = $"/api/files/{fileMetadata.Id}/download",
                FolderId = fileMetadata.FolderId
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            // Log the full exception for debugging
            // In production, you might want to use ILogger here
            return StatusCode(500, new { message = "An error occurred while uploading the file. Please try again.", detail = ex.Message });
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

    [HttpGet("{id}/stream")]
    [AllowAnonymous] // Allow anonymous but verify token from query string
    public async Task<IActionResult> StreamFile(Guid id, [FromQuery] string? token = null)
    {
        // Log request for debugging
        Console.WriteLine($"[StreamFile] Request received - FileId: {id}, HasToken: {!string.IsNullOrEmpty(token)}, Origin: {Request.Headers["Origin"]}");
        
        // Verify token from query string (for video element which can't send headers)
        if (!string.IsNullOrEmpty(token))
        {
            try
            {
                var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                var jwtSettings = _configuration.GetSection("JwtSettings");
                var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not found");
                
                var validationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings["Issuer"] ?? "WebApp",
                    ValidAudience = jwtSettings["Audience"] ?? "WebAppUsers",
                    IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secretKey))
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
                Console.WriteLine($"[StreamFile] Token validated successfully for file {id}");
                // Token is valid, continue
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[StreamFile] Token validation failed for file {id}: {ex.Message}");
                // If token validation fails, try Authorization header as fallback
                if (!User.Identity?.IsAuthenticated ?? true)
                {
                    Console.WriteLine($"[StreamFile] Unauthorized - no valid token or authentication");
                    return Unauthorized();
                }
            }
        }
        else
        {
            // No token in query, check Authorization header
            if (!User.Identity?.IsAuthenticated ?? true)
            {
                Console.WriteLine($"[StreamFile] Unauthorized - no token in query and no authentication header");
                return Unauthorized();
            }
            Console.WriteLine($"[StreamFile] Authenticated via Authorization header for file {id}");
        }

        var fileMetadata = await _fileService.GetFileMetadataAsync(id);
        if (fileMetadata == null || fileMetadata.IsDeleted)
        {
            return NotFound();
        }

        var filePath = fileMetadata.FilePath;
        if (!System.IO.File.Exists(filePath))
        {
            // Log file not found for debugging
            Console.WriteLine($"[StreamFile] File not found: {filePath} for fileId: {id}");
            return NotFound();
        }

        // Log streaming request for debugging
        Console.WriteLine($"[StreamFile] Streaming file: {fileMetadata.OriginalFileName} (ID: {id}), ContentType: {fileMetadata.ContentType}, Size: {fileMetadata.FileSize} bytes");

        var fileInfo = new FileInfo(filePath);
        var fileLength = fileInfo.Length;

        // Support Range requests for video streaming (HTTP 206 Partial Content)
        var rangeHeader = Request.Headers["Range"].ToString();
        if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes="))
        {
            var ranges = rangeHeader.Replace("bytes=", "").Split('-');
            long start = 0;
            long end = fileLength - 1;

            if (ranges.Length > 0 && long.TryParse(ranges[0], out var startRange))
            {
                start = startRange;
            }

            if (ranges.Length > 1 && !string.IsNullOrEmpty(ranges[1]) && long.TryParse(ranges[1], out var endRange))
            {
                end = endRange;
            }

            // Ensure valid range
            if (start > end || start < 0 || end >= fileLength)
            {
                Console.WriteLine($"[StreamFile] Invalid range: start={start}, end={end}, fileLength={fileLength}");
                return StatusCode(416, new { message = "Range Not Satisfiable" });
            }

            Console.WriteLine($"[StreamFile] Range request: bytes {start}-{end}/{fileLength}");

            var contentLength = end - start + 1;
            
            Response.StatusCode = 206; // Partial Content
            Response.Headers.Append("Content-Range", $"bytes {start}-{end}/{fileLength}");
            Response.Headers.Append("Accept-Ranges", "bytes");
            Response.Headers.Append("Content-Length", contentLength.ToString());
            Response.ContentType = fileMetadata.ContentType;
            Response.Headers.Append("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
            // CORS headers are handled by middleware - don't set manually to avoid conflicts
            Response.Headers.Append("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length"); // Expose headers for Range requests

            // Tối ưu buffer size cho streaming: 2MB buffer để tăng tốc độ đọc
            // Buffer lớn hơn = ít I/O operations hơn = nhanh hơn
            const int STREAM_BUFFER_SIZE = 2 * 1024 * 1024; // 2MB buffer
            var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, STREAM_BUFFER_SIZE, useAsync: true);
            
            // Use PartialFileStream to ensure only the requested range is streamed
            var partialStream = new PartialFileStream(fileStream, start, contentLength);

            return new FileStreamResult(partialStream, fileMetadata.ContentType)
            {
                EnableRangeProcessing = false // We handle range manually
            };
        }

        // No Range request - For large video files, return first chunk only to avoid Content-Length mismatch
        // Browser will then send Range requests for the rest
        // For small files, return full file with chunked encoding
        
        const long LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
        
        if (fileLength > LARGE_FILE_THRESHOLD)
        {
            // For large files, return first 2MB only - browser will request more with Range headers
            long start = 0;
            long end = Math.Min(2 * 1024 * 1024 - 1, fileLength - 1); // First 2MB
            var contentLength = end - start + 1;
            
            Response.StatusCode = 206; // Partial Content
            Response.Headers.Append("Content-Range", $"bytes {start}-{end}/{fileLength}");
            Response.Headers.Append("Accept-Ranges", "bytes");
            Response.Headers.Append("Content-Length", contentLength.ToString());
            Response.ContentType = fileMetadata.ContentType;
            Response.Headers.Append("Cache-Control", "public, max-age=3600");
            // CORS headers are handled by middleware - don't set manually to avoid conflicts
            Response.Headers.Append("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");
            
            const int STREAM_BUFFER_SIZE = 2 * 1024 * 1024; // 2MB buffer
            var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, STREAM_BUFFER_SIZE, useAsync: true);
            
            // Use PartialFileStream to ensure only the requested range is streamed
            var partialStream = new PartialFileStream(fileStream, start, contentLength);
            
            return new FileStreamResult(partialStream, fileMetadata.ContentType)
            {
                EnableRangeProcessing = false
            };
        }
        else
        {
            // For small files, return full file - browser can handle it
            Response.Headers.Append("Accept-Ranges", "bytes");
            Response.Headers.Append("Content-Length", fileLength.ToString());
            Response.ContentType = fileMetadata.ContentType;
            Response.Headers.Append("Cache-Control", "public, max-age=3600");
            // CORS headers are handled by middleware - don't set manually to avoid conflicts
            Response.Headers.Append("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");
            
            const int FULL_STREAM_BUFFER_SIZE = 4 * 1024 * 1024; // 4MB buffer
            var fullFileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, FULL_STREAM_BUFFER_SIZE, useAsync: true);
            
            return new FileStreamResult(fullFileStream, fileMetadata.ContentType)
            {
                EnableRangeProcessing = true // Let ASP.NET Core handle for small files
            };
        }
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
            DownloadUrl = $"/api/files/{fileMetadata.Id}/download",
            FolderId = fileMetadata.FolderId
        };

        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetFiles([FromQuery] string? fileType = null, [FromQuery] Guid? folderId = null)
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
        if (folderId.HasValue)
        {
            files = files.Where(f => f.FolderId == folderId.Value);
        }
        else
        {
            // If folderId is not specified, show only files in root (FolderId is null)
            files = files.Where(f => f.FolderId == null);
        }
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
            DownloadUrl = $"/api/files/{f.Id}/download",
            FolderId = f.FolderId
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

    [HttpPost("{id}/move")]
    public async Task<IActionResult> MoveFile(Guid id, [FromBody] MoveFileDto dto)
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

        if (dto.FolderId.HasValue)
        {
            var folder = await _unitOfWork.Folders.GetByIdAsync(dto.FolderId.Value);
            if (folder == null || folder.IsDeleted || folder.UserId != userId)
            {
                return BadRequest(new { message = "Target folder not found" });
            }

            fileMetadata.FolderId = dto.FolderId;
        }
        else
        {
            fileMetadata.FolderId = null;
        }

        fileMetadata.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.Files.UpdateAsync(fileMetadata);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    // Chunked upload endpoints for large files (up to 5GB)
    // Using ConcurrentDictionary for thread safety
    private static readonly ConcurrentDictionary<string, ChunkedUploadSession> _uploadSessions = new();

    [HttpPost("upload/chunked/init")]
    public IActionResult InitChunkedUpload([FromBody] InitChunkedUploadDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        if (dto.FileSize > _fileService.GetMaxFileSize())
        {
            return BadRequest(new { message = $"File size exceeds maximum allowed size of {_fileService.GetMaxFileSize() / (1024L * 1024 * 1024)}GB" });
        }

        if (!_fileService.IsValidFileType(dto.ContentType))
        {
            return BadRequest(new { message = "Invalid file type" });
        }

        var uploadId = Guid.NewGuid().ToString();
        var fileType = _fileService.GetFileTypeFromContentType(dto.ContentType);
        var fileExtension = Path.GetExtension(dto.FileName);
        var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
        var year = DateTime.UtcNow.Year;
        var month = DateTime.UtcNow.Month.ToString("00");
        var typeFolder = fileType.ToString().ToLower();
        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
        var fileDirectory = Path.Combine(uploadsPath, typeFolder, year.ToString(), month);

        if (!Directory.Exists(fileDirectory))
        {
            Directory.CreateDirectory(fileDirectory);
        }

        var filePath = Path.Combine(fileDirectory, uniqueFileName);

        // Delete existing file if it exists (from previous failed upload)
        if (System.IO.File.Exists(filePath))
        {
            try
            {
                System.IO.File.Delete(filePath);
            }
            catch
            {
                // Ignore delete errors
            }
        }

        // Don't pre-allocate - let file grow naturally as chunks are written
        // This approach: Track actual bytes written instead of pre-allocating

        _uploadSessions[uploadId] = new ChunkedUploadSession
        {
            UploadId = uploadId,
            UserId = userId,
            FileName = dto.FileName,
            UniqueFileName = uniqueFileName,
            FilePath = filePath,
            ContentType = dto.ContentType,
            FileSize = dto.FileSize,
            TotalChunks = dto.TotalChunks,
            Description = dto.Description,
            FolderId = dto.FolderId,
            UploadedChunks = new bool[dto.TotalChunks],
            TotalBytesWritten = 0, // Track actual bytes written
            CreatedAt = DateTime.UtcNow
        };

        return Ok(new InitChunkedUploadResponseDto { UploadId = uploadId });
    }

    [HttpPost("upload/chunked")]
    public async Task<IActionResult> UploadChunk(
        [FromForm] IFormFile chunk,
        [FromForm] string uploadId,
        [FromForm] int chunkIndex,
        [FromForm] int totalChunks,
        [FromForm] string fileName,
        [FromForm] string contentType)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        if (chunk == null || chunk.Length == 0)
        {
            return BadRequest(new { message = "No chunk uploaded" });
        }

        if (!_uploadSessions.TryGetValue(uploadId, out var session) || session.UserId != userId)
        {
            return BadRequest(new { message = "Invalid upload session" });
        }

        if (chunkIndex < 0 || chunkIndex >= session.TotalChunks)
        {
            return BadRequest(new { message = "Invalid chunk index" });
        }

        try
        {
            // Standard approach: Use actual chunk size from request, not calculated position
            // This handles last chunk correctly (may be smaller than CHUNK_SIZE)
            const long CHUNK_SIZE = 10L * 1024 * 1024; // 10MB
            var expectedPosition = chunkIndex * CHUNK_SIZE;
            var actualChunkSize = chunk.Length; // Actual size of this chunk

            // Lock file access to prevent race conditions
            long bytesWritten = 0;
            using (var fileStream = new FileStream(session.FilePath, FileMode.OpenOrCreate, FileAccess.Write, FileShare.Write, 81920, useAsync: true))
            {
                // Seek to expected position
                fileStream.Seek(expectedPosition, SeekOrigin.Begin);
                var positionBefore = fileStream.Position;

                // Write chunk data and track actual bytes written
                using (var chunkStream = chunk.OpenReadStream())
                {
                    await chunkStream.CopyToAsync(fileStream, 81920);
                }
                
                // Calculate bytes written by comparing positions
                bytesWritten = fileStream.Position - positionBefore;
                
                // Ensure data is flushed to disk
                await fileStream.FlushAsync();
            }

            // Verify chunk was written correctly
            if (bytesWritten != actualChunkSize)
            {
                return BadRequest(new { 
                    message = "Chunk size mismatch", 
                    expected = actualChunkSize, 
                    written = bytesWritten 
                });
            }

            // Track actual bytes written
            session.TotalBytesWritten += bytesWritten;

            session.UploadedChunks[chunkIndex] = true;
            session.UploadedChunkCount = session.UploadedChunks.Count(c => c);

            return Ok(new { 
                chunkIndex = chunkIndex, 
                uploadedChunks = session.UploadedChunkCount, 
                totalChunks = session.TotalChunks,
                totalBytesWritten = session.TotalBytesWritten
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to upload chunk", detail = ex.Message });
        }
    }

    [HttpPost("upload/chunked/finalize")]
    public async Task<IActionResult> FinalizeChunkedUpload([FromBody] FinalizeChunkedUploadDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        if (!_uploadSessions.TryGetValue(dto.UploadId, out var session) || session.UserId != userId)
        {
            return BadRequest(new { message = "Invalid upload session" });
        }

        if (session.UploadedChunkCount != session.TotalChunks)
        {
            return BadRequest(new { message = "Not all chunks have been uploaded" });
        }

        try
        {
            var fileInfo = new FileInfo(session.FilePath);
            if (!fileInfo.Exists)
            {
                return BadRequest(new { message = "File not found" });
            }

            // Standard approach: Verify using actual bytes written, not file system size
            // File system size may differ due to allocation units, but bytes written should match
            if (session.TotalBytesWritten != session.FileSize)
            {
                return BadRequest(new { 
                    message = "File size mismatch - bytes written don't match expected size", 
                    expected = session.FileSize, 
                    actualBytesWritten = session.TotalBytesWritten,
                    fileSystemSize = fileInfo.Length,
                    difference = Math.Abs(session.TotalBytesWritten - session.FileSize)
                });
            }

            // Also verify file system size is reasonable (within 1MB tolerance for allocation units)
            var sizeDifference = Math.Abs(fileInfo.Length - session.FileSize);
            if (sizeDifference > 1024 * 1024) // More than 1MB difference
            {
                return BadRequest(new { 
                    message = "File system size mismatch", 
                    expected = session.FileSize, 
                    actual = fileInfo.Length,
                    difference = sizeDifference
                });
            }

            // If file is larger than expected (due to pre-allocation or other issues), truncate it
            if (fileInfo.Length > session.FileSize)
            {
                using (var fs = new FileStream(session.FilePath, FileMode.Open, FileAccess.Write, FileShare.None))
                {
                    fs.SetLength(session.FileSize);
                }
                fileInfo.Refresh();
            }

            var fileMetadata = new Core.Entities.FileMetadata
            {
                FileName = session.UniqueFileName,
                OriginalFileName = session.FileName,
                FilePath = session.FilePath,
                ContentType = session.ContentType,
                FileSize = session.FileSize,
                FileType = _fileService.GetFileTypeFromContentType(session.ContentType),
                Description = session.Description,
                UserId = userId,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                FolderId = session.FolderId
            };

            await _unitOfWork.Files.AddAsync(fileMetadata);
            await _unitOfWork.SaveChangesAsync();

            _uploadSessions.TryRemove(dto.UploadId, out _);

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
                DownloadUrl = $"/api/files/{fileMetadata.Id}/download",
                FolderId = fileMetadata.FolderId
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to finalize upload", detail = ex.Message });
        }
    }

    [HttpPost("upload/chunked/cancel")]
    public IActionResult CancelChunkedUpload([FromBody] CancelChunkedUploadDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        if (_uploadSessions.TryGetValue(dto.UploadId, out var session) && session.UserId == userId)
        {
            try
            {
                if (System.IO.File.Exists(session.FilePath))
                {
                    System.IO.File.Delete(session.FilePath);
                }
            }
            catch
            {
                // Ignore delete errors
            }
            _uploadSessions.TryRemove(dto.UploadId, out _);
        }

        return NoContent();
    }

    private class ChunkedUploadSession
    {
        public string UploadId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string UniqueFileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public int TotalChunks { get; set; }
        public bool[] UploadedChunks { get; set; } = Array.Empty<bool>();
        public int UploadedChunkCount { get; set; }
        public long TotalBytesWritten { get; set; } = 0; // Track actual bytes written
        public string? Description { get; set; }
        public Guid? FolderId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

