namespace WebApp.Application.DTOs.Chat;

public class MessageNotificationDto
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NotificationTypeDto Type { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public MessageDto? Message { get; set; }
}

public enum NotificationTypeDto
{
    NewMessage = 0,
    Mention = 1,
    Reaction = 2,
    RoomInvite = 3
}
