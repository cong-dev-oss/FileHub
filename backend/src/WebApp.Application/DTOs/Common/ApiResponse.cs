namespace WebApp.Application.DTOs.Common;

/// <summary>
/// Cấu trúc phản hồi chuẩn cho API thành công
/// </summary>
/// <typeparam name="T">Kiểu dữ liệu trả về</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Trạng thái thành công (true) hoặc thất bại (false)
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Thông báo mô tả kết quả
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Dữ liệu trả về
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// Mã lỗi (nếu có)
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// Thời gian phản hồi (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public ApiResponse()
    {
    }

    public ApiResponse(T data, string message = "Thành công")
    {
        Success = true;
        Message = message;
        Data = data;
    }
}

/// <summary>
/// Cấu trúc phản hồi lỗi chuẩn cho API
/// </summary>
public class ApiErrorResponse
{
    /// <summary>
    /// Trạng thái thành công (luôn là false)
    /// </summary>
    public bool Success { get; set; } = false;

    /// <summary>
    /// Thông báo lỗi
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Mã lỗi
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// Danh sách lỗi chi tiết (validation errors, etc.)
    /// </summary>
    public Dictionary<string, string[]>? Errors { get; set; }

    /// <summary>
    /// Thời gian phản hồi (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public ApiErrorResponse()
    {
    }

    public ApiErrorResponse(string message, string? errorCode = null)
    {
        Message = message;
        ErrorCode = errorCode;
    }

    public ApiErrorResponse(string message, Dictionary<string, string[]> errors, string? errorCode = null)
    {
        Message = message;
        Errors = errors;
        ErrorCode = errorCode;
    }
}
