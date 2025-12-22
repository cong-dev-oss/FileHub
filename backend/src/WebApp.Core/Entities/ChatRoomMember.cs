namespace WebApp.Core.Entities;

public class ChatRoomMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChatRoomId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public ChatRoomRole Role { get; set; } = ChatRoomRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual ChatRoom ChatRoom { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}

public enum ChatRoomRole
{
    Member = 0,
    Admin = 1,
    Owner = 2
}
