namespace WebApp.Core.Entities;

public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Content { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public Guid? ChatRoomId { get; set; }
    public string? ReceiverId { get; set; } // For direct messages
    public MessageType MessageType { get; set; } = MessageType.Text;
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public Guid? ReplyToMessageId { get; set; } // For reply functionality

    // Navigation properties
    public virtual User Sender { get; set; } = null!;
    public virtual User? Receiver { get; set; }
    public virtual ChatRoom? ChatRoom { get; set; }
    public virtual Message? ReplyToMessage { get; set; } // Reference to replied message
    public virtual ICollection<MessageAttachment> Attachments { get; set; } = new List<MessageAttachment>();
}

public enum MessageType
{
    Text = 0,
    Image = 1,
    File = 2,
    System = 3
}
