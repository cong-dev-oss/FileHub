namespace WebApp.Application.DTOs.Chat;

public class MessageAutoDeleteSettingDto
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public AutoDeletePeriodDto Period { get; set; }
    public int? PeriodValue { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateMessageAutoDeleteSettingDto
{
    public bool IsEnabled { get; set; }
    public AutoDeletePeriodDto Period { get; set; }
    public int? PeriodValue { get; set; }
}

public class UpdateMessageAutoDeleteSettingDto
{
    public bool IsEnabled { get; set; }
    public AutoDeletePeriodDto Period { get; set; }
    public int? PeriodValue { get; set; }
}

public enum AutoDeletePeriodDto
{
    Never = 0,
    Hours = 1,
    Days = 2,
    Weeks = 3,
    Months = 4
}
