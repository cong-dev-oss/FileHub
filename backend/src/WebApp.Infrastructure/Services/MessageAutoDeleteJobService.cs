using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;
using WebApp.Infrastructure.Hubs;

namespace WebApp.Infrastructure.Services;

public class MessageAutoDeleteJobService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MessageAutoDeleteJobService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1); // Chạy mỗi giờ

    public MessageAutoDeleteJobService(
        IServiceProvider serviceProvider,
        ILogger<MessageAutoDeleteJobService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Message Auto Delete Job Service started");

        // Chờ một chút để đảm bảo database đã sẵn sàng
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAutoDeleteAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in message auto delete job service");
            }

            // Chờ đến lần kiểm tra tiếp theo
            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task ProcessAutoDeleteAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        try
        {
            // Lấy tất cả các cài đặt tự động xóa đang được bật
            var settings = await unitOfWork.GetRepository<MessageAutoDeleteSetting>()
                .FindAsync(s => s.IsEnabled && s.Period != AutoDeletePeriod.Never)
                .ContinueWith(t => t.Result.ToList(), cancellationToken);

            if (!settings.Any())
            {
                _logger.LogDebug("No auto delete settings found");
                return;
            }

            _logger.LogInformation("Processing {Count} auto delete settings", settings.Count);

            foreach (var setting in settings)
            {
                try
                {
                    await ProcessUserMessagesAsync(unitOfWork, setting, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing auto delete for user {UserId}", setting.UserId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ProcessAutoDeleteAsync");
        }
    }

    private async Task ProcessUserMessagesAsync(
        IUnitOfWork unitOfWork,
        MessageAutoDeleteSetting setting,
        CancellationToken cancellationToken)
    {
        if (!setting.PeriodValue.HasValue || setting.PeriodValue.Value <= 0)
        {
            return;
        }

        // Tính toán thời điểm xóa (tin nhắn cũ hơn thời điểm này sẽ bị xóa)
        DateTime deleteBeforeDate = CalculateDeleteBeforeDate(setting.Period, setting.PeriodValue.Value);
        
        _logger.LogDebug(
            "Processing auto delete for user {UserId}: Period={Period}, PeriodValue={PeriodValue}, DeleteBefore={DeleteBefore}",
            setting.UserId, setting.Period, setting.PeriodValue, deleteBeforeDate);

        // Lấy tất cả tin nhắn của user cần xóa
        // Xóa cả tin nhắn gửi đi và tin nhắn nhận được
        var messagesToDelete = await unitOfWork.GetRepository<Message>()
            .FindAsync(m =>
                !m.IsDeleted &&
                m.CreatedAt < deleteBeforeDate &&
                (m.SenderId == setting.UserId || m.ReceiverId == setting.UserId))
            .ContinueWith(t => t.Result.ToList(), cancellationToken);

        if (!messagesToDelete.Any())
        {
            return;
        }

        _logger.LogInformation(
            "Deleting {Count} messages for user {UserId} (older than {DeleteBefore})",
            messagesToDelete.Count, setting.UserId, deleteBeforeDate);

        int deletedCount = 0;

        foreach (var message in messagesToDelete)
        {
            try
            {
                // Xóa attachments trước
                var attachments = await unitOfWork.GetRepository<MessageAttachment>()
                    .FindAsync(a => a.MessageId == message.Id)
                    .ContinueWith(t => t.Result.ToList(), cancellationToken);

                foreach (var attachment in attachments)
                {
                    await unitOfWork.GetRepository<MessageAttachment>().DeleteAsync(attachment);
                }

                // Xóa notifications liên quan
                var notifications = await unitOfWork.GetRepository<MessageNotification>()
                    .FindAsync(n => n.MessageId == message.Id)
                    .ContinueWith(t => t.Result.ToList(), cancellationToken);

                foreach (var notification in notifications)
                {
                    await unitOfWork.GetRepository<MessageNotification>().DeleteAsync(notification);
                }

                // Xóa tin nhắn
                await unitOfWork.GetRepository<Message>().DeleteAsync(message);
                deletedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting message {MessageId}", message.Id);
            }
        }

        if (deletedCount > 0)
        {
            await unitOfWork.SaveChangesAsync();
            _logger.LogInformation(
                "Successfully deleted {Count} messages for user {UserId}",
                deletedCount, setting.UserId);
        }
    }

    private static DateTime CalculateDeleteBeforeDate(AutoDeletePeriod period, int periodValue)
    {
        return period switch
        {
            AutoDeletePeriod.Hours => DateTime.UtcNow.AddHours(-periodValue),
            AutoDeletePeriod.Days => DateTime.UtcNow.AddDays(-periodValue),
            AutoDeletePeriod.Weeks => DateTime.UtcNow.AddDays(-(periodValue * 7)),
            AutoDeletePeriod.Months => DateTime.UtcNow.AddMonths(-periodValue),
            _ => DateTime.UtcNow
        };
    }
}
