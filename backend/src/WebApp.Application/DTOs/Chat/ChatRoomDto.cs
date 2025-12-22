namespace WebApp.Application.DTOs.Chat;

public class ChatRoomDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ChatRoomTypeDto RoomType { get; set; }
    public string CreatedById { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int UnreadCount { get; set; }
    public MessageDto? LastMessage { get; set; }
    public List<ChatRoomMemberDto> Members { get; set; } = new();
}

public class ChatRoomMemberDto
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? UserAvatar { get; set; }
    public ChatRoomRoleDto Role { get; set; }
    public DateTime JoinedAt { get; set; }
    public bool IsActive { get; set; }
}

public enum ChatRoomTypeDto
{
    Direct = 0,
    Group = 1,
    Channel = 2
}

public enum ChatRoomRoleDto
{
    Member = 0,
    Admin = 1,
    Owner = 2
}
