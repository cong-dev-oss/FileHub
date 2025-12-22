using System.Linq;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebApp.Application.DTOs.Chat;
using WebApp.Application.DTOs.Common;
using WebApp.Application.Interfaces;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;
using WebApp.Infrastructure.Hubs;

namespace WebApp.Infrastructure.Services;

public class ChatService : IChatService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<User> _userManager;
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatService(
        IUnitOfWork unitOfWork,
        UserManager<User> userManager,
        IHubContext<ChatHub> hubContext)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _hubContext = hubContext;
    }

    #region Chat Rooms

    public async Task<ServiceResult<ChatRoomDto>> CreateChatRoomAsync(string userId, CreateChatRoomDto dto)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return ServiceResult<ChatRoomDto>.Fail("User not found");

            var room = new ChatRoom
            {
                Name = dto.Name,
                Description = dto.Description,
                RoomType = (ChatRoomType)dto.RoomType,
                CreatedById = userId,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.GetRepository<ChatRoom>().AddAsync(room);

            // Add creator as member
            var creatorMember = new ChatRoomMember
            {
                ChatRoomId = room.Id,
                UserId = userId,
                Role = ChatRoomRole.Owner,
                JoinedAt = DateTime.UtcNow
            };
            await _unitOfWork.GetRepository<ChatRoomMember>().AddAsync(creatorMember);

            // Add other members
            foreach (var memberId in dto.MemberIds.Where(id => id != userId))
            {
                var member = await _userManager.FindByIdAsync(memberId);
                if (member != null)
                {
                    var roomMember = new ChatRoomMember
                    {
                        ChatRoomId = room.Id,
                        UserId = memberId,
                        Role = ChatRoomRole.Member,
                        JoinedAt = DateTime.UtcNow
                    };
                    await _unitOfWork.GetRepository<ChatRoomMember>().AddAsync(roomMember);
                }
            }

            await _unitOfWork.SaveChangesAsync();

            var roomDto = await MapToChatRoomDtoAsync(room, userId);
            return ServiceResult<ChatRoomDto>.Ok(roomDto);
        }
        catch (Exception ex)
        {
            return ServiceResult<ChatRoomDto>.Fail($"Error creating chat room: {ex.Message}");
        }
    }

    public async Task<ServiceResult<List<ChatRoomDto>>> GetUserChatRoomsAsync(string userId)
    {
        try
        {
            var memberRooms = await _unitOfWork.GetRepository<ChatRoomMember>()
                .FindAsync(m => m.UserId == userId && m.IsActive && m.LeftAt == null);

            var roomIds = memberRooms.Select(m => m.ChatRoomId).ToList();
            var rooms = await _unitOfWork.GetRepository<ChatRoom>()
                .FindAsync(r => roomIds.Contains(r.Id) && r.IsActive);

            var roomDtos = new List<ChatRoomDto>();
            foreach (var room in rooms)
            {
                var dto = await MapToChatRoomDtoAsync(room, userId);
                roomDtos.Add(dto);
            }

            // Sort by last message time
            roomDtos = roomDtos.OrderByDescending(r => r.LastMessage?.CreatedAt ?? r.CreatedAt).ToList();

            return ServiceResult<List<ChatRoomDto>>.Ok(roomDtos);
        }
        catch (Exception ex)
        {
            return ServiceResult<List<ChatRoomDto>>.Fail($"Error getting chat rooms: {ex.Message}");
        }
    }

    public async Task<ServiceResult<ChatRoomDto>> GetChatRoomByIdAsync(Guid roomId, string userId)
    {
        try
        {
            var room = await _unitOfWork.GetRepository<ChatRoom>().GetByIdAsync(roomId);
            if (room == null)
                return ServiceResult<ChatRoomDto>.Fail("Chat room not found");

            // Check if user is member
            var member = await _unitOfWork.GetRepository<ChatRoomMember>()
                .FirstOrDefaultAsync(m => m.ChatRoomId == roomId && m.UserId == userId && m.IsActive && m.LeftAt == null);
            
            if (member == null && room.RoomType != ChatRoomType.Channel)
                return ServiceResult<ChatRoomDto>.Fail("You are not a member of this chat room");

            var dto = await MapToChatRoomDtoAsync(room, userId);
            return ServiceResult<ChatRoomDto>.Ok(dto);
        }
        catch (Exception ex)
        {
            return ServiceResult<ChatRoomDto>.Fail($"Error getting chat room: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> AddMemberToRoomAsync(Guid roomId, string userId, string memberId)
    {
        try
        {
            var room = await _unitOfWork.GetRepository<ChatRoom>().GetByIdAsync(roomId);
            if (room == null)
                return ServiceResult<bool>.Fail("Chat room not found");

            // Check permissions
            var currentMember = await _unitOfWork.GetRepository<ChatRoomMember>()
                .FirstOrDefaultAsync(m => m.ChatRoomId == roomId && m.UserId == userId && m.IsActive);
            
            if (currentMember == null || (currentMember.Role != ChatRoomRole.Admin && currentMember.Role != ChatRoomRole.Owner))
                return ServiceResult<bool>.Fail("You don't have permission to add members");

            var existingMember = await _unitOfWork.GetRepository<ChatRoomMember>()
                .FirstOrDefaultAsync(m => m.ChatRoomId == roomId && m.UserId == memberId);
            
            if (existingMember != null)
                return ServiceResult<bool>.Fail("User is already a member");

            var newMember = new ChatRoomMember
            {
                ChatRoomId = roomId,
                UserId = memberId,
                Role = ChatRoomRole.Member,
                JoinedAt = DateTime.UtcNow
            };

            await _unitOfWork.GetRepository<ChatRoomMember>().AddAsync(newMember);
            await _unitOfWork.SaveChangesAsync();

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error adding member: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> RemoveMemberFromRoomAsync(Guid roomId, string userId, string memberId)
    {
        try
        {
            var currentMember = await _unitOfWork.GetRepository<ChatRoomMember>()
                .FirstOrDefaultAsync(m => m.ChatRoomId == roomId && m.UserId == userId && m.IsActive);
            
            if (currentMember == null || (currentMember.Role != ChatRoomRole.Admin && currentMember.Role != ChatRoomRole.Owner))
                return ServiceResult<bool>.Fail("You don't have permission to remove members");

            var memberToRemove = await _unitOfWork.GetRepository<ChatRoomMember>()
                .FirstOrDefaultAsync(m => m.ChatRoomId == roomId && m.UserId == memberId && m.IsActive);
            
            if (memberToRemove == null)
                return ServiceResult<bool>.Fail("Member not found");

            memberToRemove.IsActive = false;
            memberToRemove.LeftAt = DateTime.UtcNow;
            await _unitOfWork.GetRepository<ChatRoomMember>().UpdateAsync(memberToRemove);
            await _unitOfWork.SaveChangesAsync();

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error removing member: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> LeaveChatRoomAsync(Guid roomId, string userId)
    {
        try
        {
            var member = await _unitOfWork.GetRepository<ChatRoomMember>()
                .FirstOrDefaultAsync(m => m.ChatRoomId == roomId && m.UserId == userId && m.IsActive);
            
            if (member == null)
                return ServiceResult<bool>.Fail("You are not a member of this room");

            member.IsActive = false;
            member.LeftAt = DateTime.UtcNow;
            await _unitOfWork.GetRepository<ChatRoomMember>().UpdateAsync(member);
            await _unitOfWork.SaveChangesAsync();

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error leaving chat room: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> DeleteChatRoomAsync(Guid roomId, string userId)
    {
        try
        {
            var room = await _unitOfWork.GetRepository<ChatRoom>().GetByIdAsync(roomId);
            if (room == null)
                return ServiceResult<bool>.Fail("Chat room not found");

            var member = await _unitOfWork.GetRepository<ChatRoomMember>()
                .FirstOrDefaultAsync(m => m.ChatRoomId == roomId && m.UserId == userId && m.IsActive);
            
            if (member == null)
                return ServiceResult<bool>.Fail("You are not a member of this chat room");

            // For Direct chat (1-1), both users can delete
            // For Group/Channel, only Owner can delete
            if (room.RoomType != ChatRoomType.Direct && member.Role != ChatRoomRole.Owner)
                return ServiceResult<bool>.Fail("Only the owner can delete this chat room");

            // Get all messages in this room to delete attachments
            var messages = (await _unitOfWork.GetRepository<Message>()
                .FindAsync(m => m.ChatRoomId == roomId)).ToList();
            
            // Delete all message attachments (files will be handled by file service if needed)
            foreach (var message in messages)
            {
                var attachments = await _unitOfWork.GetRepository<MessageAttachment>()
                    .FindAsync(a => a.MessageId == message.Id);
                
                foreach (var attachment in attachments)
                {
                    await _unitOfWork.GetRepository<MessageAttachment>().DeleteAsync(attachment);
                }
            }

            // Delete all messages (cascade will handle attachments, but we already deleted them above)
            foreach (var message in messages)
            {
                await _unitOfWork.GetRepository<Message>().DeleteAsync(message);
            }

            // Delete all notifications related to messages in this room
            var messageIds = messages.Select(m => m.Id).ToList();
            if (messageIds.Any())
            {
                var notifications = await _unitOfWork.GetRepository<MessageNotification>()
                    .FindAsync(n => messageIds.Contains(n.MessageId));
                
                foreach (var notification in notifications)
                {
                    await _unitOfWork.GetRepository<MessageNotification>().DeleteAsync(notification);
                }
            }

            // Delete all members
            var members = await _unitOfWork.GetRepository<ChatRoomMember>()
                .FindAsync(m => m.ChatRoomId == roomId);
            
            foreach (var roomMember in members)
            {
                await _unitOfWork.GetRepository<ChatRoomMember>().DeleteAsync(roomMember);
            }

            // Finally, delete the room itself
            await _unitOfWork.GetRepository<ChatRoom>().DeleteAsync(room);
            await _unitOfWork.SaveChangesAsync();

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error deleting chat room: {ex.Message}");
        }
    }

    #endregion

    #region Messages

    public async Task<ServiceResult<MessageDto>> SendMessageAsync(string userId, CreateMessageDto dto)
    {
        try
        {
            var sender = await _userManager.FindByIdAsync(userId);
            if (sender == null)
                return ServiceResult<MessageDto>.Fail("Sender not found");

            Message message;
            List<string> notificationUserIds = new();

            if (dto.ChatRoomId.HasValue)
            {
                // Group/Channel message
                var room = await _unitOfWork.GetRepository<ChatRoom>().GetByIdAsync(dto.ChatRoomId.Value);
                if (room == null)
                    return ServiceResult<MessageDto>.Fail("Chat room not found");

                var member = await _unitOfWork.GetRepository<ChatRoomMember>()
                    .FirstOrDefaultAsync(m => m.ChatRoomId == dto.ChatRoomId.Value && m.UserId == userId && m.IsActive && m.LeftAt == null);
                
                if (member == null && room.RoomType != ChatRoomType.Channel)
                    return ServiceResult<MessageDto>.Fail("You are not a member of this chat room");

                message = new Message
                {
                    Content = dto.Content,
                    SenderId = userId,
                    ChatRoomId = dto.ChatRoomId.Value,
                    MessageType = (MessageType)dto.MessageType,
                    ReplyToMessageId = dto.ReplyToMessageId,
                    CreatedAt = DateTime.UtcNow
                };

                // Get all room members except sender for notifications
                var roomMembers = await _unitOfWork.GetRepository<ChatRoomMember>()
                    .FindAsync(m => m.ChatRoomId == dto.ChatRoomId.Value && m.UserId != userId && m.IsActive && m.LeftAt == null);
                notificationUserIds = roomMembers.Select(m => m.UserId).ToList();
            }
            else if (!string.IsNullOrEmpty(dto.ReceiverId))
            {
                // Direct message
                var receiver = await _userManager.FindByIdAsync(dto.ReceiverId);
                if (receiver == null)
                    return ServiceResult<MessageDto>.Fail("Receiver not found");

                message = new Message
                {
                    Content = dto.Content,
                    SenderId = userId,
                    ReceiverId = dto.ReceiverId,
                    MessageType = (MessageType)dto.MessageType,
                    ReplyToMessageId = dto.ReplyToMessageId,
                    CreatedAt = DateTime.UtcNow
                };

                notificationUserIds.Add(dto.ReceiverId);
            }
            else
            {
                return ServiceResult<MessageDto>.Fail("Either ChatRoomId or ReceiverId must be provided");
            }

            await _unitOfWork.GetRepository<Message>().AddAsync(message);

            // Add attachments
            if (dto.Attachments != null && dto.Attachments.Any())
            {
                foreach (var attachmentDto in dto.Attachments)
                {
                    var attachment = new MessageAttachment
                    {
                        MessageId = message.Id,
                        FileName = attachmentDto.FileName,
                        FilePath = attachmentDto.FilePath,
                        ContentType = attachmentDto.ContentType,
                        FileSize = attachmentDto.FileSize,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _unitOfWork.GetRepository<MessageAttachment>().AddAsync(attachment);
                }
            }

            await _unitOfWork.SaveChangesAsync();

            // Create notifications
            foreach (var notifyUserId in notificationUserIds)
            {
                var notification = new MessageNotification
                {
                    MessageId = message.Id,
                    UserId = notifyUserId,
                    Type = NotificationType.NewMessage,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.GetRepository<MessageNotification>().AddAsync(notification);
            }

            await _unitOfWork.SaveChangesAsync();

            var messageDto = await MapToMessageDtoAsync(message);

            // Send SignalR notification
            if (dto.ChatRoomId.HasValue)
            {
                await _hubContext.Clients.Group($"room_{dto.ChatRoomId.Value}").SendAsync("NewMessage", messageDto);
            }
            else if (!string.IsNullOrEmpty(dto.ReceiverId))
            {
                await _hubContext.Clients.User(dto.ReceiverId).SendAsync("NewMessage", messageDto);
                await _hubContext.Clients.User(userId).SendAsync("NewMessage", messageDto); // Also notify sender
            }

            // Send notification updates
            foreach (var notifyUserId in notificationUserIds)
            {
                var unreadCount = await GetUnreadNotificationCountAsync(notifyUserId);
                await _hubContext.Clients.User(notifyUserId).SendAsync("NotificationCountUpdated", unreadCount);
            }

            return ServiceResult<MessageDto>.Ok(messageDto);
        }
        catch (Exception ex)
        {
            return ServiceResult<MessageDto>.Fail($"Error sending message: {ex.Message}");
        }
    }

    public async Task<ServiceResult<List<MessageDto>>> GetMessagesAsync(Guid? roomId, string? receiverId, string userId, int page = 1, int pageSize = 50)
    {
        try
        {
            var messages = new List<Message>();

            if (roomId.HasValue)
            {
                // Check if user is member
                var member = await _unitOfWork.GetRepository<ChatRoomMember>()
                    .FirstOrDefaultAsync(m => m.ChatRoomId == roomId.Value && m.UserId == userId && m.IsActive && m.LeftAt == null);
                
                var room = await _unitOfWork.GetRepository<ChatRoom>().GetByIdAsync(roomId.Value);
                if (member == null && room?.RoomType != ChatRoomType.Channel)
                    return ServiceResult<List<MessageDto>>.Fail("You are not a member of this chat room");

                messages = (await _unitOfWork.GetRepository<Message>()
                    .FindAsync(m => m.ChatRoomId == roomId.Value && !m.IsDeleted))
                    .OrderByDescending(m => m.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .OrderBy(m => m.CreatedAt)
                    .ToList();
            }
            else if (!string.IsNullOrEmpty(receiverId))
            {
                // Direct messages - get messages between two users
                messages = (await _unitOfWork.GetRepository<Message>()
                    .FindAsync(m => 
                        ((m.SenderId == userId && m.ReceiverId == receiverId) ||
                         (m.SenderId == receiverId && m.ReceiverId == userId)) &&
                        !m.IsDeleted))
                    .OrderByDescending(m => m.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .OrderBy(m => m.CreatedAt)
                    .ToList();
            }
            else
            {
                return ServiceResult<List<MessageDto>>.Fail("Either roomId or receiverId must be provided");
            }

            var messageDtos = new List<MessageDto>();
            foreach (var message in messages)
            {
                var dto = await MapToMessageDtoAsync(message);
                messageDtos.Add(dto);
            }

            return ServiceResult<List<MessageDto>>.Ok(messageDtos);
        }
        catch (Exception ex)
        {
            return ServiceResult<List<MessageDto>>.Fail($"Error getting messages: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> MarkMessageAsReadAsync(Guid messageId, string userId)
    {
        try
        {
            var message = await _unitOfWork.GetRepository<Message>().GetByIdAsync(messageId);
            if (message == null)
                return ServiceResult<bool>.Fail("Message not found");

            // Only mark as read if user is the receiver
            if (message.ReceiverId == userId || 
                (message.ChatRoomId.HasValue && message.SenderId != userId))
            {
                if (!message.IsRead)
                {
                    message.IsRead = true;
                    message.ReadAt = DateTime.UtcNow;
                    await _unitOfWork.GetRepository<Message>().UpdateAsync(message);
                    await _unitOfWork.SaveChangesAsync();
                }

                // Update notification
                var notification = await _unitOfWork.GetRepository<MessageNotification>()
                    .FirstOrDefaultAsync(n => n.MessageId == messageId && n.UserId == userId && !n.IsRead);
                
                if (notification != null)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                    await _unitOfWork.GetRepository<MessageNotification>().UpdateAsync(notification);
                    await _unitOfWork.SaveChangesAsync();
                }
            }

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error marking message as read: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> MarkRoomAsReadAsync(Guid roomId, string userId)
    {
        try
        {
            var unreadMessages = await _unitOfWork.GetRepository<Message>()
                .FindAsync(m => m.ChatRoomId == roomId && m.SenderId != userId && !m.IsRead && !m.IsDeleted);

            foreach (var message in unreadMessages)
            {
                message.IsRead = true;
                message.ReadAt = DateTime.UtcNow;
                await _unitOfWork.GetRepository<Message>().UpdateAsync(message);
            }

            var unreadNotifications = await _unitOfWork.GetRepository<MessageNotification>()
                .FindAsync(n => n.UserId == userId && !n.IsRead && 
                    n.Message != null && n.Message.ChatRoomId == roomId);

            foreach (var notification in unreadNotifications)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                await _unitOfWork.GetRepository<MessageNotification>().UpdateAsync(notification);
            }

            await _unitOfWork.SaveChangesAsync();

            var unreadCount = await GetUnreadNotificationCountAsync(userId);
            await _hubContext.Clients.User(userId).SendAsync("NotificationCountUpdated", unreadCount);

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error marking room as read: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> DeleteMessageAsync(Guid messageId, string userId)
    {
        try
        {
            var message = await _unitOfWork.GetRepository<Message>().GetByIdAsync(messageId);
            if (message == null)
                return ServiceResult<bool>.Fail("Message not found");

            if (message.SenderId != userId)
                return ServiceResult<bool>.Fail("You can only delete your own messages");

            // Store room/receiver info before deletion for SignalR notification
            var roomId = message.ChatRoomId;
            var receiverId = message.ReceiverId;

            // Delete all attachments
            var attachments = await _unitOfWork.GetRepository<MessageAttachment>()
                .FindAsync(a => a.MessageId == messageId);
            foreach (var attachment in attachments)
            {
                await _unitOfWork.GetRepository<MessageAttachment>().DeleteAsync(attachment);
            }

            // Delete all notifications related to this message
            var notifications = await _unitOfWork.GetRepository<MessageNotification>()
                .FindAsync(n => n.MessageId == messageId);
            foreach (var notification in notifications)
            {
                await _unitOfWork.GetRepository<MessageNotification>().DeleteAsync(notification);
            }

            // Delete the message completely (no trace)
            await _unitOfWork.GetRepository<Message>().DeleteAsync(message);
            await _unitOfWork.SaveChangesAsync();

            // Notify via SignalR that message was deleted
            if (roomId.HasValue)
            {
                await _hubContext.Clients.Group($"room_{roomId.Value}")
                    .SendAsync("MessageDeleted", new { messageId, roomId = roomId.Value });
            }
            else if (!string.IsNullOrEmpty(receiverId))
            {
                // Notify both sender and receiver for direct messages
                await _hubContext.Clients.User(userId)
                    .SendAsync("MessageDeleted", new { messageId, receiverId });
                await _hubContext.Clients.User(receiverId)
                    .SendAsync("MessageDeleted", new { messageId, receiverId });
            }

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error deleting message: {ex.Message}");
        }
    }

    #endregion

    #region Notifications

    public async Task<ServiceResult<List<MessageNotificationDto>>> GetUserNotificationsAsync(string userId, int page = 1, int pageSize = 20)
    {
        try
        {
            var notifications = (await _unitOfWork.GetRepository<MessageNotification>()
                .FindAsync(n => n.UserId == userId))
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var notificationDtos = new List<MessageNotificationDto>();
            foreach (var notification in notifications)
            {
                var dto = new MessageNotificationDto
                {
                    Id = notification.Id,
                    MessageId = notification.MessageId,
                    UserId = notification.UserId,
                    Type = (NotificationTypeDto)notification.Type,
                    IsRead = notification.IsRead,
                    CreatedAt = notification.CreatedAt
                };

                var message = await _unitOfWork.GetRepository<Message>().GetByIdAsync(notification.MessageId);
                if (message != null)
                {
                    dto.Message = await MapToMessageDtoAsync(message);
                }

                notificationDtos.Add(dto);
            }

            return ServiceResult<List<MessageNotificationDto>>.Ok(notificationDtos);
        }
        catch (Exception ex)
        {
            return ServiceResult<List<MessageNotificationDto>>.Fail($"Error getting notifications: {ex.Message}");
        }
    }

    public async Task<ServiceResult<int>> GetUnreadNotificationCountAsync(string userId)
    {
        try
        {
            var count = await _unitOfWork.GetRepository<MessageNotification>()
                .CountAsync(n => n.UserId == userId && !n.IsRead);
            
            return ServiceResult<int>.Ok(count);
        }
        catch (Exception ex)
        {
            return ServiceResult<int>.Fail($"Error getting notification count: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> MarkNotificationAsReadAsync(Guid notificationId, string userId)
    {
        try
        {
            var notification = await _unitOfWork.GetRepository<MessageNotification>().GetByIdAsync(notificationId);
            if (notification == null)
                return ServiceResult<bool>.Fail("Notification not found");

            if (notification.UserId != userId)
                return ServiceResult<bool>.Fail("You can only mark your own notifications as read");

            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _unitOfWork.GetRepository<MessageNotification>().UpdateAsync(notification);
            await _unitOfWork.SaveChangesAsync();

            var unreadCount = await GetUnreadNotificationCountAsync(userId);
            await _hubContext.Clients.User(userId).SendAsync("NotificationCountUpdated", unreadCount);

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error marking notification as read: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> MarkAllNotificationsAsReadAsync(string userId)
    {
        try
        {
            var unreadNotifications = await _unitOfWork.GetRepository<MessageNotification>()
                .FindAsync(n => n.UserId == userId && !n.IsRead);

            foreach (var notification in unreadNotifications)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                await _unitOfWork.GetRepository<MessageNotification>().UpdateAsync(notification);
            }

            await _unitOfWork.SaveChangesAsync();

            await _hubContext.Clients.User(userId).SendAsync("NotificationCountUpdated", 0);

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error marking all notifications as read: {ex.Message}");
        }
    }

    #endregion

    #region Helper Methods

    private async Task<ChatRoomDto> MapToChatRoomDtoAsync(ChatRoom room, string userId)
    {
        var createdBy = await _userManager.FindByIdAsync(room.CreatedById);
        
        var members = await _unitOfWork.GetRepository<ChatRoomMember>()
            .FindAsync(m => m.ChatRoomId == room.Id && m.IsActive && m.LeftAt == null);

        var memberDtos = new List<ChatRoomMemberDto>();
        foreach (var member in members)
        {
            var user = await _userManager.FindByIdAsync(member.UserId);
            if (user != null)
            {
                memberDtos.Add(new ChatRoomMemberDto
                {
                    Id = member.Id,
                    UserId = member.UserId,
                    UserName = $"{user.FirstName} {user.LastName}",
                    Role = (ChatRoomRoleDto)member.Role,
                    JoinedAt = member.JoinedAt,
                    IsActive = member.IsActive
                });
            }
        }

        // Get last message
        var lastMessage = (await _unitOfWork.GetRepository<Message>()
            .FindAsync(m => m.ChatRoomId == room.Id && !m.IsDeleted))
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefault();

        MessageDto? lastMessageDto = null;
        if (lastMessage != null)
        {
            lastMessageDto = await MapToMessageDtoAsync(lastMessage);
        }

        // Get unread count - count unread notifications for this room
        var unreadCount = await _unitOfWork.GetRepository<MessageNotification>()
            .CountAsync(n => n.UserId == userId && !n.IsRead && 
                n.Message != null && n.Message.ChatRoomId == room.Id && !n.Message.IsDeleted);

        return new ChatRoomDto
        {
            Id = room.Id,
            Name = room.Name,
            Description = room.Description,
            RoomType = (ChatRoomTypeDto)room.RoomType,
            CreatedById = room.CreatedById,
            CreatedByName = createdBy != null ? $"{createdBy.FirstName} {createdBy.LastName}" : "",
            CreatedAt = room.CreatedAt,
            UpdatedAt = room.UpdatedAt,
            UnreadCount = unreadCount,
            LastMessage = lastMessageDto,
            Members = memberDtos
        };
    }

    private async Task<MessageDto> MapToMessageDtoAsync(Message message)
    {
        var sender = await _userManager.FindByIdAsync(message.SenderId);
        User? receiver = null;
        if (!string.IsNullOrEmpty(message.ReceiverId))
        {
            receiver = await _userManager.FindByIdAsync(message.ReceiverId);
        }

        var attachments = await _unitOfWork.GetRepository<MessageAttachment>()
            .FindAsync(a => a.MessageId == message.Id);

        MessageDto? replyToMessageDto = null;
        if (message.ReplyToMessageId.HasValue)
        {
            var replyToMessage = await _unitOfWork.GetRepository<Message>()
                .GetByIdAsync(message.ReplyToMessageId.Value);
            if (replyToMessage != null && !replyToMessage.IsDeleted)
            {
                replyToMessageDto = await MapToMessageDtoAsync(replyToMessage);
            }
        }

        return new MessageDto
        {
            Id = message.Id,
            Content = message.Content,
            SenderId = message.SenderId,
            SenderName = sender != null ? $"{sender.FirstName} {sender.LastName}" : "",
            ReceiverId = message.ReceiverId,
            ReceiverName = receiver != null ? $"{receiver.FirstName} {receiver.LastName}" : null,
            ChatRoomId = message.ChatRoomId,
            MessageType = (MessageTypeDto)message.MessageType,
            IsRead = message.IsRead,
            CreatedAt = message.CreatedAt,
            ReadAt = message.ReadAt,
            ReplyToMessageId = message.ReplyToMessageId,
            ReplyToMessage = replyToMessageDto,
            Attachments = attachments.Select(a => new MessageAttachmentDto
            {
                Id = a.Id,
                FileName = a.FileName,
                FilePath = a.FilePath,
                ContentType = a.ContentType,
                FileSize = a.FileSize
            }).ToList()
        };
    }

    private async Task<int> GetUnreadNotificationCountInternalAsync(string userId)
    {
        return await _unitOfWork.GetRepository<MessageNotification>()
            .CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    #endregion
}
