using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace WebApp.Infrastructure.Hubs;

[Authorize]
public class ChatHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
        await base.OnDisconnectedAsync(exception);
    }

    // Join a chat room
    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"room_{roomId}");
    }

    // Leave a chat room
    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"room_{roomId}");
    }

    // Typing indicator
    public async Task SendTyping(string roomId, string userId, string userName)
    {
        await Clients.GroupExcept($"room_{roomId}", Context.ConnectionId)
            .SendAsync("UserTyping", new { roomId, userId, userName });
    }

    // Stop typing indicator
    public async Task StopTyping(string roomId, string userId)
    {
        await Clients.GroupExcept($"room_{roomId}", Context.ConnectionId)
            .SendAsync("UserStoppedTyping", new { roomId, userId });
    }
}
