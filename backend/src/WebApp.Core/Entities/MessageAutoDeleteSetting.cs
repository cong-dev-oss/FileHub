namespace WebApp.Core.Entities;

public class MessageAutoDeleteSetting
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = false;
    public AutoDeletePeriod Period { get; set; } = AutoDeletePeriod.Never;
    public int? PeriodValue { get; set; } // Số lượng giờ/ngày/tuần/tháng
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation properties
    public virtual User User { get; set; } = null!;
}

public enum AutoDeletePeriod
{
    Never = 0,      // Không tự động xóa
    Hours = 1,      // Theo giờ
    Days = 2,       // Theo ngày
    Weeks = 3,      // Theo tuần
    Months = 4      // Theo tháng
}
