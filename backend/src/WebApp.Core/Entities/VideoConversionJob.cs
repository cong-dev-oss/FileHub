namespace WebApp.Core.Entities;

public class VideoConversionJob
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FileId { get; set; }
    public virtual FileMetadata? File { get; set; }
    
    public string? UserId { get; set; }
    public virtual User? User { get; set; }
    
    public ConversionStatus Status { get; set; } = ConversionStatus.Pending;
    public int Progress { get; set; } = 0; // 0-100
    
    public string? OriginalFilePath { get; set; }
    public string? ConvertedFilePath { get; set; }
    public string? ErrorMessage { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    
    // Conversion settings
    public string? VideoCodec { get; set; } = "libx264"; // H.264 for compatibility
    public string? AudioCodec { get; set; } = "aac";
    public int? VideoBitrate { get; set; } // kbps, null = auto
    public int? AudioBitrate { get; set; } = 128; // kbps
    public string? Resolution { get; set; } // e.g., "1920x1080", null = keep original
    public int? FrameRate { get; set; } // fps, null = keep original
    public string? Preset { get; set; } = "medium"; // FFmpeg preset: ultrafast, fast, medium, slow
}

public enum ConversionStatus
{
    Pending = 0,
    Queued = 1,
    Processing = 2,
    Completed = 3,
    Failed = 4,
    Cancelled = 5
}


