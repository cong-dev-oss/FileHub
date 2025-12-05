using Microsoft.AspNetCore.Identity;

namespace WebApp.Core.Entities;

public class User : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation properties
    public virtual ICollection<FileMetadata> Files { get; set; } = new List<FileMetadata>();
    public virtual ICollection<Content> Contents { get; set; } = new List<Content>();
}









