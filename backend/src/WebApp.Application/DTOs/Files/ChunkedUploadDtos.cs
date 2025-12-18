namespace WebApp.Application.DTOs.Files;

public class InitChunkedUploadDto
{
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public int TotalChunks { get; set; }
    public string? Description { get; set; }
    public Guid? FolderId { get; set; }
}

public class InitChunkedUploadResponseDto
{
    public string UploadId { get; set; } = string.Empty;
}

// Note: UploadChunkDto doesn't include IFormFile here because IFormFile is in Microsoft.AspNetCore.Http
// The controller will receive IFormFile directly and extract other data from form

public class FinalizeChunkedUploadDto
{
    public string UploadId { get; set; } = string.Empty;
}

public class CancelChunkedUploadDto
{
    public string UploadId { get; set; } = string.Empty;
}

public class ConversionSettingsDto
{
    public string? VideoCodec { get; set; }
    public string? AudioCodec { get; set; }
    public int? VideoBitrate { get; set; }
    public int? AudioBitrate { get; set; }
    public string? Resolution { get; set; }
    public int? FrameRate { get; set; }
    public string? Preset { get; set; }
}
