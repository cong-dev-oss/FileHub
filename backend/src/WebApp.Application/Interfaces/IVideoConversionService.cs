using WebApp.Application.DTOs.Common;
using WebApp.Application.DTOs.Files;

namespace WebApp.Application.Interfaces;

public interface IVideoConversionService
{
    Task<ServiceResult<ConversionJobDto>> StartConversionAsync(Guid fileId, ConversionSettingsDto? settings, string userId);
    Task<ServiceResult<ConversionJobStatusDto>> GetJobStatusAsync(Guid jobId, string userId);
    Task<ServiceResult<List<ConversionJobStatusDto>>> GetUserJobsAsync(string userId);
    Task<ServiceResult<bool>> CancelJobAsync(Guid jobId, string userId);
}
