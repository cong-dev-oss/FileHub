namespace WebApp.Core.Entities;

public class FileMetadata
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public FileType FileType { get; set; }
    public string? Description { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    
    // Navigation properties
    public virtual User? User { get; set; }
    public string? UserId { get; set; }
}

public enum FileType
{
    Document = 1,    // Word, PDF, etc.
    Spreadsheet = 2, // Excel, CSV, etc.
    Video = 3,
    Image = 4,
    Audio = 5,
    Other = 6
}



