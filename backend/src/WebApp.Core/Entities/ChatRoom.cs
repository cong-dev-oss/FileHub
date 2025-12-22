namespace WebApp.Core.Entities;

public class ChatRoom
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ChatRoomType RoomType { get; set; } = ChatRoomType.Direct;
    public string CreatedById { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual User CreatedBy { get; set; } = null!;
    public virtual ICollection<ChatRoomMember> Members { get; set; } = new List<ChatRoomMember>();
    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
}

public enum ChatRoomType
{
    Direct = 0,      // 1-1 chat
    Group = 1,       // Group chat
    Channel = 2      // Public channel
}
