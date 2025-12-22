namespace WebApp.Core.Entities;

public class MessageNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MessageId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NotificationType Type { get; set; } = NotificationType.NewMessage;
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    // Navigation properties
    public virtual Message Message { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}

public enum NotificationType
{
    NewMessage = 0,
    Mention = 1,
    Reaction = 2,
    RoomInvite = 3
}
