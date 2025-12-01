namespace WebApp.Core.Entities;

public class Content
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Body { get; set; } = string.Empty;
    public ContentType ContentType { get; set; }
    public ContentStatus Status { get; set; } = ContentStatus.Draft;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    
    // Navigation properties
    public virtual User? User { get; set; }
    public string? UserId { get; set; }
    public virtual ICollection<ContentFile> ContentFiles { get; set; } = new List<ContentFile>();
}

public enum ContentType
{
    Page = 1,
    Post = 2,
    Media = 3,
    Custom = 4
}

public enum ContentStatus
{
    Draft = 1,
    Published = 2,
    Archived = 3
}

public class ContentFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContentId { get; set; }
    public Guid FileMetadataId { get; set; }
    public int DisplayOrder { get; set; }
    
    public virtual Content? Content { get; set; }
    public virtual FileMetadata? FileMetadata { get; set; }
}



