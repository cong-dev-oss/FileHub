using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using WebApp.API.Extensions;
using WebApp.Application.DTOs.Files;
using WebApp.Application.Interfaces;
using WebApp.Infrastructure.Hubs;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VideoConversionController : ControllerBase
{
    private readonly IVideoConversionService _videoConversionService;
    private readonly IHubContext<VideoConversionHub> _hubContext;
    private readonly ILogger<VideoConversionController> _logger;

    public VideoConversionController(
        IVideoConversionService videoConversionService,
        IHubContext<VideoConversionHub> hubContext,
        ILogger<VideoConversionController> logger)
    {
        _videoConversionService = videoConversionService;
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpPost("{fileId}/convert")]
    public async Task<IActionResult> StartConversion(Guid fileId, [FromBody] ConversionSettingsDto? settings = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _videoConversionService.StartConversionAsync(fileId, settings, userId);
        if (!result.Success)
        {
            if (result.ErrorMessage?.Contains("Không tìm thấy") == true)
            {
                return this.NotFoundResponse(result.ErrorMessage);
            }
            if (result.ErrorMessage?.Contains("Không có quyền") == true)
            {
                return this.ForbidResponse(result.ErrorMessage);
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Tạo công việc chuyển đổi thất bại", "START_CONVERSION_FAILED");
        }

        var response = new
        {
            jobId = result.Data!.JobId,
            fileId = result.Data.FileId,
            status = result.Data.Status,
            progress = result.Data.Progress,
            createdAt = result.Data.CreatedAt
        };
        return this.OkResponse(response, "Tạo công việc chuyển đổi thành công");
    }

    [HttpGet("{jobId}")]
    public async Task<IActionResult> GetJobStatus(Guid jobId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _videoConversionService.GetJobStatusAsync(jobId, userId);
        if (!result.Success)
        {
            if (result.ErrorMessage?.Contains("Không tìm thấy") == true)
            {
                return this.NotFoundResponse(result.ErrorMessage);
            }
            if (result.ErrorMessage?.Contains("Không có quyền") == true)
            {
                return this.ForbidResponse(result.ErrorMessage);
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Lỗi không xác định", "GET_JOB_STATUS_FAILED");
        }

        var response = new
        {
            jobId = result.Data!.JobId,
            fileId = result.Data.FileId,
            status = result.Data.Status,
            progress = result.Data.Progress,
            errorMessage = result.Data.ErrorMessage,
            createdAt = result.Data.CreatedAt,
            startedAt = result.Data.StartedAt,
            completedAt = result.Data.CompletedAt,
            convertedFilePath = result.Data.ConvertedFilePath
        };
        return this.OkResponse(response, "Lấy trạng thái công việc thành công");
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserJobs(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null || currentUserId != userId)
        {
            return this.ForbidResponse();
        }

        var result = await _videoConversionService.GetUserJobsAsync(userId);
        if (!result.Success)
        {
            return this.BadRequestResponse(result.ErrorMessage ?? "Lỗi không xác định", "GET_USER_JOBS_FAILED");
        }

        var jobsList = result.Data!.Select(j => new
        {
            jobId = j.JobId,
            fileId = j.FileId,
            status = j.Status,
            progress = j.Progress,
            errorMessage = j.ErrorMessage,
            createdAt = j.CreatedAt,
            startedAt = j.StartedAt,
            completedAt = j.CompletedAt
        });

        return this.OkResponse(jobsList, "Lấy danh sách công việc chuyển đổi thành công");
    }

    [HttpPost("{jobId}/cancel")]
    public async Task<IActionResult> CancelJob(Guid jobId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return this.UnauthorizedResponse();
        }

        var result = await _videoConversionService.CancelJobAsync(jobId, userId);
        if (!result.Success)
        {
            if (result.ErrorMessage?.Contains("Không tìm thấy") == true)
            {
                return this.NotFoundResponse(result.ErrorMessage);
            }
            if (result.ErrorMessage?.Contains("Không có quyền") == true)
            {
                return this.ForbidResponse(result.ErrorMessage);
            }
            return this.BadRequestResponse(result.ErrorMessage ?? "Hủy công việc thất bại", "CANCEL_JOB_FAILED");
        }

        await _hubContext.Clients.Group($"job_{jobId}")
            .SendAsync("JobStatusChanged", new
            {
                jobId = jobId,
                status = "Cancelled",
                progress = 0
            });

        return this.OkResponse(new { message = "Hủy công việc thành công" }, "Hủy công việc thành công");
    }
}

