namespace WebApp.Application.DTOs.Chat;

public class MessageDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string? SenderAvatar { get; set; }
    public Guid? ChatRoomId { get; set; }
    public string? ReceiverId { get; set; }
    public string? ReceiverName { get; set; }
    public MessageTypeDto MessageType { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public Guid? ReplyToMessageId { get; set; }
    public MessageDto? ReplyToMessage { get; set; } // Reference to replied message
    public List<MessageAttachmentDto> Attachments { get; set; } = new();
}

public class MessageAttachmentDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
}

public enum MessageTypeDto
{
    Text = 0,
    Image = 1,
    File = 2,
    System = 3
}
