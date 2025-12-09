using Microsoft.AspNetCore.SignalR;

namespace WebApp.Infrastructure.Hubs;

public class VideoConversionHub : Hub
{
    public async Task JoinJobGroup(string jobId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"job_{jobId}");
    }

    public async Task LeaveJobGroup(string jobId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"job_{jobId}");
    }
}









