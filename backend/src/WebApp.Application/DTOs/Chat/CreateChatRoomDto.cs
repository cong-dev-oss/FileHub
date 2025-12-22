namespace WebApp.Application.DTOs.Chat;

public class CreateChatRoomDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ChatRoomTypeDto RoomType { get; set; } = ChatRoomTypeDto.Direct;
    public List<string> MemberIds { get; set; } = new();
}
