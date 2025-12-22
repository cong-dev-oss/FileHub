namespace WebApp.Application.DTOs.Chat;

public class CreateMessageDto
{
    public string Content { get; set; } = string.Empty;
    public Guid? ChatRoomId { get; set; }
    public string? ReceiverId { get; set; } // For direct messages
    public MessageTypeDto MessageType { get; set; } = MessageTypeDto.Text;
    public List<CreateAttachmentDto>? Attachments { get; set; }
    public Guid? ReplyToMessageId { get; set; } // For reply functionality
}

public class CreateAttachmentDto
{
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
}
