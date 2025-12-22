using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApp.API.Extensions;
using WebApp.Application.DTOs.Chat;
using WebApp.Application.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly IMessageAutoDeleteSettingService _autoDeleteSettingService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public ChatController(
        IChatService chatService, 
        IMessageAutoDeleteSettingService autoDeleteSettingService,
        IHttpClientFactory httpClientFactory, 
        IConfiguration configuration)
    {
        _chatService = chatService;
        _autoDeleteSettingService = autoDeleteSettingService;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
    }

    #region Chat Rooms

    [HttpPost("rooms")]
    public async Task<IActionResult> CreateChatRoom([FromBody] CreateChatRoomDto dto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var userId = GetUserId();
        var result = await _chatService.CreateChatRoomAsync(userId, dto);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to create chat room");
        }

        return this.OkResponse(result.Data!, "Chat room created successfully");
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> GetUserChatRooms()
    {
        var userId = GetUserId();
        var result = await _chatService.GetUserChatRoomsAsync(userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to get chat rooms");
        }

        return this.OkResponse(result.Data!);
    }

    [HttpGet("rooms/{roomId}")]
    public async Task<IActionResult> GetChatRoomById(Guid roomId)
    {
        var userId = GetUserId();
        var result = await _chatService.GetChatRoomByIdAsync(roomId, userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Chat room not found");
        }

        return this.OkResponse(result.Data!);
    }

    [HttpPost("rooms/{roomId}/members/{memberId}")]
    public async Task<IActionResult> AddMemberToRoom(Guid roomId, string memberId)
    {
        var userId = GetUserId();
        var result = await _chatService.AddMemberToRoomAsync(roomId, userId, memberId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to add member");
        }

        return this.OkResponse(result.Data, "Member added successfully");
    }

    [HttpDelete("rooms/{roomId}/members/{memberId}")]
    public async Task<IActionResult> RemoveMemberFromRoom(Guid roomId, string memberId)
    {
        var userId = GetUserId();
        var result = await _chatService.RemoveMemberFromRoomAsync(roomId, userId, memberId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to remove member");
        }

        return this.OkResponse(result.Data, "Member removed successfully");
    }

    [HttpPost("rooms/{roomId}/leave")]
    public async Task<IActionResult> LeaveChatRoom(Guid roomId)
    {
        var userId = GetUserId();
        var result = await _chatService.LeaveChatRoomAsync(roomId, userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to leave chat room");
        }

        return this.OkResponse(result.Data, "Left chat room successfully");
    }

    [HttpDelete("rooms/{roomId}")]
    public async Task<IActionResult> DeleteChatRoom(Guid roomId)
    {
        var userId = GetUserId();
        var result = await _chatService.DeleteChatRoomAsync(roomId, userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to delete chat room");
        }

        return this.OkResponse(result.Data, "Chat room deleted successfully");
    }

    #endregion

    #region Messages

    [HttpPost("messages")]
    public async Task<IActionResult> SendMessage([FromBody] CreateMessageDto dto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var userId = GetUserId();
        var result = await _chatService.SendMessageAsync(userId, dto);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to send message");
        }

        return this.OkResponse(result.Data!, "Message sent successfully");
    }

    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages([FromQuery] Guid? roomId, [FromQuery] string? receiverId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var userId = GetUserId();
        var result = await _chatService.GetMessagesAsync(roomId, receiverId, userId, page, pageSize);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to get messages");
        }

        return this.OkResponse(result.Data!);
    }

    [HttpPost("messages/{messageId}/read")]
    public async Task<IActionResult> MarkMessageAsRead(Guid messageId)
    {
        var userId = GetUserId();
        var result = await _chatService.MarkMessageAsReadAsync(messageId, userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to mark message as read");
        }

        return this.OkResponse(result.Data, "Message marked as read");
    }

    [HttpPost("rooms/{roomId}/read")]
    public async Task<IActionResult> MarkRoomAsRead(Guid roomId)
    {
        var userId = GetUserId();
        var result = await _chatService.MarkRoomAsReadAsync(roomId, userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to mark room as read");
        }

        return this.OkResponse(result.Data, "Room marked as read");
    }

    [HttpDelete("messages/{messageId}")]
    public async Task<IActionResult> DeleteMessage(Guid messageId)
    {
        var userId = GetUserId();
        var result = await _chatService.DeleteMessageAsync(messageId, userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to delete message");
        }

        return this.OkResponse(result.Data, "Message deleted successfully");
    }

    #endregion

    #region Notifications

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var result = await _chatService.GetUserNotificationsAsync(userId, page, pageSize);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to get notifications");
        }

        return this.OkResponse(result.Data!);
    }

    [HttpGet("notifications/unread-count")]
    public async Task<IActionResult> GetUnreadNotificationCount()
    {
        var userId = GetUserId();
        var result = await _chatService.GetUnreadNotificationCountAsync(userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to get notification count");
        }

        return this.OkResponse(result.Data!);
    }

    [HttpPost("notifications/{notificationId}/read")]
    public async Task<IActionResult> MarkNotificationAsRead(Guid notificationId)
    {
        var userId = GetUserId();
        var result = await _chatService.MarkNotificationAsReadAsync(notificationId, userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to mark notification as read");
        }

        return this.OkResponse(result.Data, "Notification marked as read");
    }

    [HttpPost("notifications/read-all")]
    public async Task<IActionResult> MarkAllNotificationsAsRead()
    {
        var userId = GetUserId();
        var result = await _chatService.MarkAllNotificationsAsReadAsync(userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to mark all notifications as read");
        }

        return this.OkResponse(result.Data, "All notifications marked as read");
    }

    #endregion

    #region GIF Search

    [HttpGet("gifs/search")]
    public async Task<IActionResult> SearchGifs([FromQuery] string q, [FromQuery] int limit = 20)
    {
        try
        {
            // Get Giphy API key from configuration or use default
            var apiKey = _configuration["Giphy:ApiKey"] ?? "dc6zaTOxFJmzC";
            
            var httpClient = _httpClientFactory.CreateClient();
            var url = $"https://api.giphy.com/v1/gifs/search?api_key={apiKey}&q={Uri.EscapeDataString(q)}&limit={limit}&rating=g";
            
            var response = await httpClient.GetAsync(url);
            
            if (!response.IsSuccessStatusCode)
            {
                return this.BadRequestResponse($"Giphy API error: {response.StatusCode}", "GIPHY_API_ERROR");
            }
            
            var content = await response.Content.ReadAsStringAsync();
            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<object>(content);
            
            return this.OkResponse(jsonResponse, "GIF search successful");
        }
        catch (Exception ex)
        {
            return this.BadRequestResponse($"Error searching GIFs: {ex.Message}", "GIF_SEARCH_ERROR");
        }
    }

    [HttpGet("gifs/trending")]
    public async Task<IActionResult> GetTrendingGifs([FromQuery] int limit = 20)
    {
        try
        {
            // Get Giphy API key from configuration or use default
            var apiKey = _configuration["Giphy:ApiKey"] ?? "dc6zaTOxFJmzC";
            
            var httpClient = _httpClientFactory.CreateClient();
            var url = $"https://api.giphy.com/v1/gifs/trending?api_key={apiKey}&limit={limit}&rating=g";
            
            var response = await httpClient.GetAsync(url);
            
            if (!response.IsSuccessStatusCode)
            {
                return this.BadRequestResponse($"Giphy API error: {response.StatusCode}", "GIPHY_API_ERROR");
            }
            
            var content = await response.Content.ReadAsStringAsync();
            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<object>(content);
            
            return this.OkResponse(jsonResponse, "Trending GIFs retrieved successfully");
        }
        catch (Exception ex)
        {
            return this.BadRequestResponse($"Error getting trending GIFs: {ex.Message}", "GIF_TRENDING_ERROR");
        }
    }

    #endregion

    #region Message Auto Delete Settings

    [HttpGet("auto-delete-settings")]
    public async Task<IActionResult> GetAutoDeleteSetting()
    {
        var userId = GetUserId();
        var result = await _autoDeleteSettingService.GetSettingByUserIdAsync(userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to get auto delete setting");
        }

        return this.OkResponse(result.Data!, "Auto delete setting retrieved successfully");
    }

    [HttpPost("auto-delete-settings")]
    public async Task<IActionResult> CreateOrUpdateAutoDeleteSetting([FromBody] CreateMessageAutoDeleteSettingDto dto)
    {
        if (!ModelState.IsValid)
        {
            return this.BadRequestResponse(ModelState);
        }

        var userId = GetUserId();
        var result = await _autoDeleteSettingService.CreateOrUpdateSettingAsync(userId, dto);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to save auto delete setting");
        }

        return this.OkResponse(result.Data!, "Auto delete setting saved successfully");
    }

    [HttpDelete("auto-delete-settings")]
    public async Task<IActionResult> DeleteAutoDeleteSetting()
    {
        var userId = GetUserId();
        var result = await _autoDeleteSettingService.DeleteSettingAsync(userId);
        
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Failed to delete auto delete setting");
        }

        return this.OkResponse(result.Data!, "Auto delete setting deleted successfully");
    }

    #endregion
}
