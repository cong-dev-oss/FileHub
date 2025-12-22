using WebApp.Application.DTOs.Chat;
using WebApp.Application.DTOs.Common;

namespace WebApp.Application.Interfaces;

public interface IMessageAutoDeleteSettingService
{
    Task<ServiceResult<MessageAutoDeleteSettingDto>> GetSettingByUserIdAsync(string userId);
    Task<ServiceResult<MessageAutoDeleteSettingDto>> CreateOrUpdateSettingAsync(string userId, CreateMessageAutoDeleteSettingDto dto);
    Task<ServiceResult<bool>> DeleteSettingAsync(string userId);
}
