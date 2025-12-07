using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Diagnostics;
using WebApp.Infrastructure.Hubs;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;

namespace WebApp.Infrastructure.Services;

public class VideoConversionService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<VideoConversionService> _logger;
    private readonly IHubContext<VideoConversionHub> _hubContext;
    private readonly string _ffmpegPath;
    private readonly string _convertedVideosPath;

    public VideoConversionService(
        IServiceProvider serviceProvider,
        ILogger<VideoConversionService> logger,
        IHubContext<VideoConversionHub> hubContext,
        Microsoft.Extensions.Hosting.IHostEnvironment environment)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _hubContext = hubContext;
        
        // FFmpeg path - có thể config trong appsettings
        _ffmpegPath = Environment.GetEnvironmentVariable("FFMPEG_PATH") ?? "ffmpeg";
        
        _convertedVideosPath = Path.Combine(environment.ContentRootPath, "Uploads", "converted");
        if (!Directory.Exists(_convertedVideosPath))
        {
            Directory.CreateDirectory(_convertedVideosPath);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Video Conversion Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingJobsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in video conversion service");
            }

            // Check every 5 seconds for new jobs
            await Task.Delay(5000, stoppingToken);
        }
    }

    private async Task ProcessPendingJobsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        // Get next pending or queued job
        var jobs = await unitOfWork.VideoConversionJobs.FindAsync(j => 
            j.Status == ConversionStatus.Pending || 
            j.Status == ConversionStatus.Queued);
        
        var job = jobs.OrderBy(j => j.CreatedAt).FirstOrDefault();

        if (job == null)
        {
            return;
        }

        // Mark as processing
        job.Status = ConversionStatus.Processing;
        job.StartedAt = DateTime.UtcNow;
        await unitOfWork.VideoConversionJobs.UpdateAsync(job);
        await unitOfWork.SaveChangesAsync();

        // Notify via SignalR
        try
        {
            await _hubContext.Clients.Group($"job_{job.Id}")
                .SendAsync("JobStatusChanged", new
                {
                    jobId = job.Id,
                    status = job.Status.ToString(),
                    progress = job.Progress
                }, cancellationToken);
        }
        catch (Exception hubEx)
        {
            _logger.LogWarning(hubEx, "Failed to send SignalR notification for job {JobId}", job.Id);
            // Continue processing even if SignalR fails
        }

        try
        {
            await ConvertVideoAsync(job, unitOfWork, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error converting video for job {JobId}", job.Id);
            
            job.Status = ConversionStatus.Failed;
            job.ErrorMessage = ex.Message;
            job.CompletedAt = DateTime.UtcNow;
            await unitOfWork.VideoConversionJobs.UpdateAsync(job);
            await unitOfWork.SaveChangesAsync();

            try
            {
                await _hubContext.Clients.Group($"job_{job.Id}")
                    .SendAsync("JobStatusChanged", new
                    {
                        jobId = job.Id,
                        status = job.Status.ToString(),
                        progress = job.Progress,
                        error = job.ErrorMessage
                    }, cancellationToken);
            }
            catch (Exception hubEx)
            {
                _logger.LogWarning(hubEx, "Failed to send SignalR notification for failed job {JobId}", job.Id);
            }
        }
    }

    private async Task ConvertVideoAsync(
        VideoConversionJob job,
        IUnitOfWork unitOfWork,
        CancellationToken cancellationToken)
    {
        var file = await unitOfWork.Files.GetByIdAsync(job.FileId);
        if (file == null)
        {
            throw new FileNotFoundException($"File metadata not found for job {job.Id}, FileId: {job.FileId}");
        }
        
        if (!System.IO.File.Exists(file.FilePath))
        {
            throw new FileNotFoundException($"Source file not found for job {job.Id}. FilePath: {file.FilePath}");
        }
        
        // Check if FFmpeg is available (skip check if already verified recently)
        // In production, you might want to cache this check
        try
        {
            var ffmpegCheck = new ProcessStartInfo
            {
                FileName = _ffmpegPath,
                Arguments = "-version",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            using var checkProcess = Process.Start(ffmpegCheck);
            if (checkProcess == null)
            {
                throw new Exception($"FFmpeg not found at path: {_ffmpegPath}. Please install FFmpeg and set FFMPEG_PATH environment variable.");
            }
            await checkProcess.WaitForExitAsync(cancellationToken);
            if (checkProcess.ExitCode != 0)
            {
                throw new Exception($"FFmpeg check failed. Please verify FFmpeg installation at: {_ffmpegPath}");
            }
        }
        catch (Exception ex) when (!(ex is FileNotFoundException))
        {
            _logger.LogError(ex, "FFmpeg check failed for job {JobId}", job.Id);
            throw new Exception($"FFmpeg is not available: {ex.Message}. Please install FFmpeg and set FFMPEG_PATH environment variable.", ex);
        }

        job.OriginalFilePath = file.FilePath;

        // Generate output file path
        var outputFileName = $"{Path.GetFileNameWithoutExtension(file.FileName)}_converted.mp4";
        var outputDir = Path.Combine(_convertedVideosPath, DateTime.UtcNow.Year.ToString(), DateTime.UtcNow.Month.ToString("00"));
        Directory.CreateDirectory(outputDir);
        var outputPath = Path.Combine(outputDir, outputFileName);

        // Build FFmpeg command
        var ffmpegArgs = BuildFFmpegCommand(file.FilePath, outputPath, job);

        _logger.LogInformation("Starting FFmpeg conversion for job {JobId}: {Command}", job.Id, ffmpegArgs);

        var processStartInfo = new ProcessStartInfo
        {
            FileName = _ffmpegPath,
            Arguments = ffmpegArgs,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = processStartInfo };
        
        var outputBuilder = new System.Text.StringBuilder();
        var errorBuilder = new System.Text.StringBuilder();

        process.OutputDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                outputBuilder.AppendLine(e.Data);
                ParseProgress(e.Data, job, unitOfWork);
            }
        };

        process.ErrorDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                errorBuilder.AppendLine(e.Data);
                ParseProgress(e.Data, job, unitOfWork);
            }
        };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        await process.WaitForExitAsync(cancellationToken);

        if (process.ExitCode != 0)
        {
            throw new Exception($"FFmpeg failed with exit code {process.ExitCode}: {errorBuilder}");
        }

        if (!System.IO.File.Exists(outputPath))
        {
            throw new Exception("Output file was not created");
        }

        // Update job
        job.Status = ConversionStatus.Completed;
        job.Progress = 100;
        job.ConvertedFilePath = outputPath;
        job.CompletedAt = DateTime.UtcNow;
        await unitOfWork.VideoConversionJobs.UpdateAsync(job);
        await unitOfWork.SaveChangesAsync();

        // Update file metadata to point to converted file
        file.FilePath = outputPath;
        file.FileName = outputFileName;
        await unitOfWork.Files.UpdateAsync(file);
        await unitOfWork.SaveChangesAsync();

        // Notify completion
        try
        {
            await _hubContext.Clients.Group($"job_{job.Id}")
                .SendAsync("JobStatusChanged", new
                {
                    jobId = job.Id,
                    status = job.Status.ToString(),
                    progress = job.Progress,
                    convertedFilePath = job.ConvertedFilePath
                }, cancellationToken);
        }
        catch (Exception hubEx)
        {
            _logger.LogWarning(hubEx, "Failed to send completion notification via SignalR for job {JobId}", job.Id);
            // Don't fail the job if SignalR notification fails
        }

        _logger.LogInformation("Video conversion completed for job {JobId}", job.Id);
    }

    private string BuildFFmpegCommand(string inputPath, string outputPath, VideoConversionJob job)
    {
        var args = new List<string>
        {
            "-i", $"\"{inputPath}\"",
            "-c:v", job.VideoCodec ?? "libx264",
            "-c:a", job.AudioCodec ?? "aac",
            "-preset", job.Preset ?? "medium",
            "-movflags", "+faststart" // Enable streaming
        };

        if (job.VideoBitrate.HasValue)
        {
            args.AddRange(new[] { "-b:v", $"{job.VideoBitrate}k" });
        }

        if (job.AudioBitrate.HasValue)
        {
            args.AddRange(new[] { "-b:a", $"{job.AudioBitrate}k" });
        }

        if (!string.IsNullOrEmpty(job.Resolution))
        {
            args.AddRange(new[] { "-vf", $"scale={job.Resolution}" });
        }

        if (job.FrameRate.HasValue)
        {
            args.AddRange(new[] { "-r", job.FrameRate.Value.ToString() });
        }

        // Ensure compatibility
        args.AddRange(new[] { "-pix_fmt", "yuv420p" }); // Ensure compatibility with all players

        args.Add("-y"); // Overwrite output file
        args.Add($"\"{outputPath}\"");

        return string.Join(" ", args);
    }

    private void ParseProgress(string line, VideoConversionJob job, IUnitOfWork unitOfWork)
    {
        // Parse FFmpeg progress: time=00:00:05.00 bitrate= 123.4kbits/s speed=0.5x
        if (line.Contains("time="))
        {
            try
            {
                var timeMatch = System.Text.RegularExpressions.Regex.Match(line, @"time=(\d+):(\d+):(\d+\.\d+)");
                if (timeMatch.Success)
                {
                    var hours = int.Parse(timeMatch.Groups[1].Value);
                    var minutes = int.Parse(timeMatch.Groups[2].Value);
                    var seconds = double.Parse(timeMatch.Groups[3].Value);
                    var totalSeconds = hours * 3600 + minutes * 60 + seconds;

                    // Estimate progress - simple heuristic: assume 1 minute of video = ~10% progress
                    // This is a rough estimate, in production you'd parse duration from FFmpeg
                    var estimatedProgress = Math.Min(95, (int)(totalSeconds / 6.0)); // ~10% per minute
                    
                    if (estimatedProgress > job.Progress && estimatedProgress - job.Progress >= 5) // Only update if significant change
                    {
                        // Use Task.Run to avoid async void issues
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                using var scope = _serviceProvider.CreateScope();
                                var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                                var jobToUpdate = await uow.VideoConversionJobs.GetByIdAsync(job.Id);
                                if (jobToUpdate != null && estimatedProgress > jobToUpdate.Progress)
                                {
                                    jobToUpdate.Progress = estimatedProgress;
                                    await uow.VideoConversionJobs.UpdateAsync(jobToUpdate);
                                    await uow.SaveChangesAsync();

                                    job.Progress = estimatedProgress; // Update local reference

                                    try
                                    {
                                        await _hubContext.Clients.Group($"job_{job.Id}")
                                            .SendAsync("JobProgress", new
                                            {
                                                jobId = job.Id,
                                                progress = estimatedProgress
                                            });
                                    }
                                    catch (Exception hubEx)
                                    {
                                        _logger.LogWarning(hubEx, "Failed to send progress update via SignalR for job {JobId}", job.Id);
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "Failed to update progress for job {JobId}", job.Id);
                            }
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                // Silently ignore parse errors - don't break conversion
                _logger.LogDebug(ex, "Failed to parse progress line: {Line}", line);
            }
        }
    }
}

