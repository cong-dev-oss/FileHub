using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using WebApp.Application.DTOs.Chat;
using WebApp.Application.DTOs.Common;
using WebApp.Application.Interfaces;
using WebApp.Core.Entities;
using WebApp.Core.Interfaces;

namespace WebApp.Infrastructure.Services;

public class MessageAutoDeleteSettingService : IMessageAutoDeleteSettingService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<User> _userManager;

    public MessageAutoDeleteSettingService(
        IUnitOfWork unitOfWork,
        UserManager<User> userManager)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
    }

    public async Task<ServiceResult<MessageAutoDeleteSettingDto>> GetSettingByUserIdAsync(string userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return ServiceResult<MessageAutoDeleteSettingDto>.Fail("User not found");

            var setting = await _unitOfWork.GetRepository<MessageAutoDeleteSetting>()
                .FindAsync(s => s.UserId == userId)
                .ContinueWith(t => t.Result.FirstOrDefault());

            if (setting == null)
            {
                // Return default setting if not exists
                return ServiceResult<MessageAutoDeleteSettingDto>.Ok(new MessageAutoDeleteSettingDto
                {
                    Id = Guid.Empty,
                    UserId = userId,
                    IsEnabled = false,
                    Period = AutoDeletePeriodDto.Never,
                    PeriodValue = null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = null
                });
            }

            var dto = MapToDto(setting);
            return ServiceResult<MessageAutoDeleteSettingDto>.Ok(dto);
        }
        catch (Exception ex)
        {
            return ServiceResult<MessageAutoDeleteSettingDto>.Fail($"Error getting setting: {ex.Message}");
        }
    }

    public async Task<ServiceResult<MessageAutoDeleteSettingDto>> CreateOrUpdateSettingAsync(string userId, CreateMessageAutoDeleteSettingDto dto)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return ServiceResult<MessageAutoDeleteSettingDto>.Fail("User not found");

            // Validate period value
            if (dto.IsEnabled && dto.Period != AutoDeletePeriodDto.Never && (!dto.PeriodValue.HasValue || dto.PeriodValue.Value <= 0))
            {
                return ServiceResult<MessageAutoDeleteSettingDto>.Fail("Period value must be greater than 0 when auto delete is enabled");
            }

            var existingSetting = await _unitOfWork.GetRepository<MessageAutoDeleteSetting>()
                .FindAsync(s => s.UserId == userId)
                .ContinueWith(t => t.Result.FirstOrDefault());

            MessageAutoDeleteSetting setting;

            if (existingSetting == null)
            {
                // Create new setting
                setting = new MessageAutoDeleteSetting
                {
                    UserId = userId,
                    IsEnabled = dto.IsEnabled,
                    Period = (AutoDeletePeriod)dto.Period,
                    PeriodValue = dto.Period == AutoDeletePeriodDto.Never ? null : dto.PeriodValue,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.GetRepository<MessageAutoDeleteSetting>().AddAsync(setting);
            }
            else
            {
                // Update existing setting
                existingSetting.IsEnabled = dto.IsEnabled;
                existingSetting.Period = (AutoDeletePeriod)dto.Period;
                existingSetting.PeriodValue = dto.Period == AutoDeletePeriodDto.Never ? null : dto.PeriodValue;
                existingSetting.UpdatedAt = DateTime.UtcNow;
                await _unitOfWork.GetRepository<MessageAutoDeleteSetting>().UpdateAsync(existingSetting);
                setting = existingSetting;
            }

            await _unitOfWork.SaveChangesAsync();

            var resultDto = MapToDto(setting);
            return ServiceResult<MessageAutoDeleteSettingDto>.Ok(resultDto);
        }
        catch (Exception ex)
        {
            return ServiceResult<MessageAutoDeleteSettingDto>.Fail($"Error saving setting: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> DeleteSettingAsync(string userId)
    {
        try
        {
            var setting = await _unitOfWork.GetRepository<MessageAutoDeleteSetting>()
                .FindAsync(s => s.UserId == userId)
                .ContinueWith(t => t.Result.FirstOrDefault());

            if (setting == null)
                return ServiceResult<bool>.Fail("Setting not found");

            await _unitOfWork.GetRepository<MessageAutoDeleteSetting>().DeleteAsync(setting);
            await _unitOfWork.SaveChangesAsync();

            return ServiceResult<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Error deleting setting: {ex.Message}");
        }
    }

    private static MessageAutoDeleteSettingDto MapToDto(MessageAutoDeleteSetting setting)
    {
        return new MessageAutoDeleteSettingDto
        {
            Id = setting.Id,
            UserId = setting.UserId,
            IsEnabled = setting.IsEnabled,
            Period = (AutoDeletePeriodDto)setting.Period,
            PeriodValue = setting.PeriodValue,
            CreatedAt = setting.CreatedAt,
            UpdatedAt = setting.UpdatedAt
        };
    }
}
