namespace WebApp.Core.DTOs.Content;

public class ContentDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Body { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? CreatedBy { get; set; }
    public List<Guid>? FileIds { get; set; }
}

public class CreateContentDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Body { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft";
    public List<Guid>? FileIds { get; set; }
}

public class UpdateContentDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Body { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<Guid>? FileIds { get; set; }
}

















