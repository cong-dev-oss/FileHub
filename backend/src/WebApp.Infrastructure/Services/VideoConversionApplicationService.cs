using Microsoft.Extensions.Logging;
using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Files;
using WebApp.Application.Interfaces;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;

namespace WebApp.Infrastructure.Services;

public class VideoConversionApplicationService : IVideoConversionService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<VideoConversionApplicationService> _logger;

    public VideoConversionApplicationService(
        IUnitOfWork unitOfWork,
        ILogger<VideoConversionApplicationService> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<ServiceResult<ConversionJobDto>> StartConversionAsync(Guid fileId, ConversionSettingsDto? settings, string userId)
    {
        var file = await _unitOfWork.Files.GetByIdAsync(fileId);
        if (file == null || file.IsDeleted)
        {
            return ServiceResult<ConversionJobDto>.Fail("Không tìm thấy tệp");
        }

        if (file.FileType != FileType.Video)
        {
            return ServiceResult<ConversionJobDto>.Fail("Tệp không phải là video");
        }

        if (file.UserId != userId)
        {
            return ServiceResult<ConversionJobDto>.Fail("Không có quyền truy cập tệp này");
        }

        // Check if there's already a conversion job for this file
        var existingJobs = await _unitOfWork.VideoConversionJobs.FindAsync(j =>
            j.FileId == fileId &&
            (j.Status == ConversionStatus.Pending ||
             j.Status == ConversionStatus.Queued ||
             j.Status == ConversionStatus.Processing));

        if (existingJobs.Any())
        {
            return ServiceResult<ConversionJobDto>.Fail("Đã tồn tại công việc chuyển đổi cho tệp này");
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

        var response = new ConversionJobDto
        {
            JobId = job.Id,
            FileId = job.FileId,
            Status = job.Status.ToString(),
            Progress = job.Progress,
            CreatedAt = job.CreatedAt
        };

        return ServiceResult<ConversionJobDto>.Ok(response);
    }

    public async Task<ServiceResult<ConversionJobStatusDto>> GetJobStatusAsync(Guid jobId, string userId)
    {
        var job = await _unitOfWork.VideoConversionJobs.GetByIdAsync(jobId);
        if (job == null)
        {
            return ServiceResult<ConversionJobStatusDto>.Fail("Không tìm thấy công việc chuyển đổi");
        }

        if (job.UserId != userId)
        {
            return ServiceResult<ConversionJobStatusDto>.Fail("Không có quyền truy cập công việc này");
        }

        var response = new ConversionJobStatusDto
        {
            JobId = job.Id,
            FileId = job.FileId,
            Status = job.Status.ToString(),
            Progress = job.Progress,
            ErrorMessage = job.ErrorMessage,
            CreatedAt = job.CreatedAt,
            StartedAt = job.StartedAt,
            CompletedAt = job.CompletedAt,
            ConvertedFilePath = job.ConvertedFilePath
        };

        return ServiceResult<ConversionJobStatusDto>.Ok(response);
    }

    public async Task<ServiceResult<List<ConversionJobStatusDto>>> GetUserJobsAsync(string userId)
    {
        var jobs = await _unitOfWork.VideoConversionJobs.FindAsync(j => j.UserId == userId);
        var jobsList = jobs.OrderByDescending(j => j.CreatedAt).Select(j => new ConversionJobStatusDto
        {
            JobId = j.Id,
            FileId = j.FileId,
            Status = j.Status.ToString(),
            Progress = j.Progress,
            ErrorMessage = j.ErrorMessage,
            CreatedAt = j.CreatedAt,
            StartedAt = j.StartedAt,
            CompletedAt = j.CompletedAt
        }).ToList();

        return ServiceResult<List<ConversionJobStatusDto>>.Ok(jobsList);
    }

    public async Task<ServiceResult<bool>> CancelJobAsync(Guid jobId, string userId)
    {
        var job = await _unitOfWork.VideoConversionJobs.GetByIdAsync(jobId);
        if (job == null)
        {
            return ServiceResult<bool>.Fail("Không tìm thấy công việc chuyển đổi");
        }

        if (job.UserId != userId)
        {
            return ServiceResult<bool>.Fail("Không có quyền truy cập công việc này");
        }

        if (job.Status == ConversionStatus.Completed || job.Status == ConversionStatus.Failed)
        {
            return ServiceResult<bool>.Fail("Không thể hủy công việc đã hoàn thành hoặc thất bại");
        }

        job.Status = ConversionStatus.Cancelled;
        job.CompletedAt = DateTime.UtcNow;
        await _unitOfWork.VideoConversionJobs.UpdateAsync(job);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult<bool>.Ok(true);
    }
}
