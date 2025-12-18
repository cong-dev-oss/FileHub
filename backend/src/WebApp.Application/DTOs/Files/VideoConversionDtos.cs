namespace WebApp.Application.DTOs.Files;

public class ConversionJobDto
{
    public Guid JobId { get; set; }
    public Guid FileId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int Progress { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ConversionJobStatusDto
{
    public Guid JobId { get; set; }
    public Guid FileId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int Progress { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ConvertedFilePath { get; set; }
}
