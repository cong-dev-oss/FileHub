namespace WebApp.Core.Entities;

public class Folder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;

    public Guid? ParentId { get; set; }
    public virtual Folder? Parent { get; set; }
    public virtual ICollection<Folder> Children { get; set; } = new List<Folder>();

    public string? UserId { get; set; }
    public virtual User? User { get; set; }

    public bool IsDeleted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<FileMetadata> Files { get; set; } = new List<FileMetadata>();
}

