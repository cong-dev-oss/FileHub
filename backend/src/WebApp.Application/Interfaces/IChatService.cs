using WebApp.Application.DTOs.Chat;
using WebApp.Application.DTOs.Common;

namespace WebApp.Application.Interfaces;

public interface IChatService
{
    // Chat Rooms
    Task<ServiceResult<ChatRoomDto>> CreateChatRoomAsync(string userId, CreateChatRoomDto dto);
    Task<ServiceResult<List<ChatRoomDto>>> GetUserChatRoomsAsync(string userId);
    Task<ServiceResult<ChatRoomDto>> GetChatRoomByIdAsync(Guid roomId, string userId);
    Task<ServiceResult<bool>> AddMemberToRoomAsync(Guid roomId, string userId, string memberId);
    Task<ServiceResult<bool>> RemoveMemberFromRoomAsync(Guid roomId, string userId, string memberId);
    Task<ServiceResult<bool>> LeaveChatRoomAsync(Guid roomId, string userId);
    Task<ServiceResult<bool>> DeleteChatRoomAsync(Guid roomId, string userId);

    // Messages
    Task<ServiceResult<MessageDto>> SendMessageAsync(string userId, CreateMessageDto dto);
    Task<ServiceResult<List<MessageDto>>> GetMessagesAsync(Guid? roomId, string? receiverId, string userId, int page = 1, int pageSize = 50);
    Task<ServiceResult<bool>> MarkMessageAsReadAsync(Guid messageId, string userId);
    Task<ServiceResult<bool>> MarkRoomAsReadAsync(Guid roomId, string userId);
    Task<ServiceResult<bool>> DeleteMessageAsync(Guid messageId, string userId);

    // Notifications
    Task<ServiceResult<List<MessageNotificationDto>>> GetUserNotificationsAsync(string userId, int page = 1, int pageSize = 20);
    Task<ServiceResult<int>> GetUnreadNotificationCountAsync(string userId);
    Task<ServiceResult<bool>> MarkNotificationAsReadAsync(Guid notificationId, string userId);
    Task<ServiceResult<bool>> MarkAllNotificationsAsReadAsync(string userId);
}
