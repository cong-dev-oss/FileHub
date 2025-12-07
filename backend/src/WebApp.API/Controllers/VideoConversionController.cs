using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using WebApp.Infrastructure.Hubs;
using WebApp.Core.DTOs.Files;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;

namespace WebApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VideoConversionController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHubContext<VideoConversionHub> _hubContext;
    private readonly ILogger<VideoConversionController> _logger;

    public VideoConversionController(
        IUnitOfWork unitOfWork,
        IHubContext<VideoConversionHub> hubContext,
        ILogger<VideoConversionController> logger)
    {
        _unitOfWork = unitOfWork;
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpPost("{fileId}/convert")]
    public async Task<IActionResult> StartConversion(Guid fileId, [FromBody] ConversionSettingsDto? settings = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var file = await _unitOfWork.Files.GetByIdAsync(fileId);
        if (file == null || file.IsDeleted)
        {
            return NotFound(new { message = "File not found" });
        }

        if (file.FileType != FileType.Video)
        {
            return BadRequest(new { message = "File is not a video" });
        }

        if (file.UserId != userId)
        {
            return Forbid();
        }

        // Check if there's already a conversion job for this file
        var existingJobs = await _unitOfWork.VideoConversionJobs.FindAsync(j => 
            j.FileId == fileId && 
            (j.Status == ConversionStatus.Pending || 
             j.Status == ConversionStatus.Queued || 
             j.Status == ConversionStatus.Processing));
        
        if (existingJobs.Any())
        {
            return BadRequest(new { message = "Conversion job already exists for this file" });
        }

        var job = new VideoConversionJob
        {
            FileId = fileId,
            UserId = userId,
            Status = ConversionStatus.Pending,
            Progress = 0,
            VideoCodec = settings?.VideoCodec ?? "libx264",
            AudioCodec = settings?.AudioCodec ?? "aac",
            VideoBitrate = settings?.VideoBitrate,
            AudioBitrate = settings?.AudioBitrate ?? 128,
            Resolution = settings?.Resolution,
            FrameRate = settings?.FrameRate,
            Preset = settings?.Preset ?? "medium"
        };

        await _unitOfWork.VideoConversionJobs.AddAsync(job);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Video conversion job {JobId} created for file {FileId}", job.Id, fileId);

        return Ok(new
        {
            jobId = job.Id,
            fileId = job.FileId,
            status = job.Status.ToString(),
            progress = job.Progress,
            createdAt = job.CreatedAt
        });
    }

    [HttpGet("{jobId}")]
    public async Task<IActionResult> GetJobStatus(Guid jobId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var job = await _unitOfWork.VideoConversionJobs.GetByIdAsync(jobId);
        if (job == null)
        {
            return NotFound();
        }

        if (job.UserId != userId)
        {
            return Forbid();
        }

        return Ok(new
        {
            jobId = job.Id,
            fileId = job.FileId,
            status = job.Status.ToString(),
            progress = job.Progress,
            errorMessage = job.ErrorMessage,
            createdAt = job.CreatedAt,
            startedAt = job.StartedAt,
            completedAt = job.CompletedAt,
            convertedFilePath = job.ConvertedFilePath
        });
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserJobs(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null || currentUserId != userId)
        {
            return Forbid();
        }

        var jobs = await _unitOfWork.VideoConversionJobs.FindAsync(j => j.UserId == userId);
        var jobsList = jobs.OrderByDescending(j => j.CreatedAt).Select(j => new
        {
            jobId = j.Id,
            fileId = j.FileId,
            status = j.Status.ToString(),
            progress = j.Progress,
            errorMessage = j.ErrorMessage,
            createdAt = j.CreatedAt,
            startedAt = j.StartedAt,
            completedAt = j.CompletedAt
        });

        return Ok(jobsList);
    }

    [HttpPost("{jobId}/cancel")]
    public async Task<IActionResult> CancelJob(Guid jobId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var job = await _unitOfWork.VideoConversionJobs.GetByIdAsync(jobId);
        if (job == null)
        {
            return NotFound();
        }

        if (job.UserId != userId)
        {
            return Forbid();
        }

        if (job.Status == ConversionStatus.Completed || job.Status == ConversionStatus.Failed)
        {
            return BadRequest(new { message = "Cannot cancel completed or failed job" });
        }

        job.Status = ConversionStatus.Cancelled;
        job.CompletedAt = DateTime.UtcNow;
        await _unitOfWork.VideoConversionJobs.UpdateAsync(job);
        await _unitOfWork.SaveChangesAsync();

        await _hubContext.Clients.Group($"job_{jobId}")
            .SendAsync("JobStatusChanged", new
            {
                jobId = job.Id,
                status = job.Status.ToString(),
                progress = job.Progress
            });

        return Ok(new { message = "Job cancelled successfully" });
    }
}

public class ConversionSettingsDto
{
    public string? VideoCodec { get; set; }
    public string? AudioCodec { get; set; }
    public int? VideoBitrate { get; set; }
    public int? AudioBitrate { get; set; }
    public string? Resolution { get; set; }
    public int? FrameRate { get; set; }
    public string? Preset { get; set; }
}

