using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using WebApp.Application.DTOs.Common;

namespace WebApp.API.Extensions;

/// <summary>
/// Extension methods cho ControllerBase để chuẩn hóa phản hồi API
/// </summary>
public static class ControllerExtensions
{
    /// <summary>
    /// Trả về phản hồi thành công với dữ liệu
    /// </summary>
    public static IActionResult OkResponse<T>(this ControllerBase controller, T data, string message = "Thành công")
    {
        var response = new ApiResponse<T>(data, message);
        return controller.Ok(response);
    }

    /// <summary>
    /// Trả về phản hồi thành công không có dữ liệu
    /// </summary>
    public static IActionResult OkResponse(this ControllerBase controller, string message = "Thành công")
    {
        var response = new ApiResponse<object?>(null, message);
        return controller.Ok(response);
    }

    /// <summary>
    /// Trả về phản hồi Created với dữ liệu
    /// </summary>
    public static IActionResult CreatedResponse<T>(this ControllerBase controller, string actionName, object routeValues, T data, string message = "Tạo thành công")
    {
        var response = new ApiResponse<T>(data, message);
        return controller.CreatedAtAction(actionName, routeValues, response);
    }

    /// <summary>
    /// Trả về phản hồi BadRequest với thông báo lỗi
    /// </summary>
    public static IActionResult BadRequestResponse(this ControllerBase controller, string message, string? errorCode = null)
    {
        var response = new ApiErrorResponse(message, errorCode);
        return controller.BadRequest(response);
    }

    /// <summary>
    /// Trả về phản hồi BadRequest với ModelState errors
    /// </summary>
    public static IActionResult BadRequestResponse(this ControllerBase controller, ModelStateDictionary modelState, string? errorCode = "VALIDATION_ERROR")
    {
        var errors = modelState
            .Where(x => x.Value?.Errors.Count > 0)
            .ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
            );

        var response = new ApiErrorResponse("Dữ liệu không hợp lệ", errors, errorCode);
        return controller.BadRequest(response);
    }

    /// <summary>
    /// Trả về phản hồi BadRequest với danh sách lỗi
    /// </summary>
    public static IActionResult BadRequestResponse(this ControllerBase controller, string message, Dictionary<string, string[]> errors, string? errorCode = null)
    {
        var response = new ApiErrorResponse(message, errors, errorCode);
        return controller.BadRequest(response);
    }

    /// <summary>
    /// Trả về phản hồi NotFound với thông báo lỗi
    /// </summary>
    public static IActionResult NotFoundResponse(this ControllerBase controller, string message = "Không tìm thấy tài nguyên", string? errorCode = "NOT_FOUND")
    {
        var response = new ApiErrorResponse(message, errorCode);
        return controller.NotFound(response);
    }

    /// <summary>
    /// Trả về phản hồi Unauthorized với thông báo lỗi
    /// </summary>
    public static IActionResult UnauthorizedResponse(this ControllerBase controller, string message = "Không có quyền truy cập", string? errorCode = "UNAUTHORIZED")
    {
        var response = new ApiErrorResponse(message, errorCode);
        return controller.Unauthorized(response);
    }

    /// <summary>
    /// Trả về phản hồi Forbid với thông báo lỗi
    /// </summary>
    public static IActionResult ForbidResponse(this ControllerBase controller, string message = "Không có quyền thực hiện hành động này", string? errorCode = "FORBIDDEN")
    {
        var response = new ApiErrorResponse(message, errorCode);
        return controller.Forbid();
    }

    /// <summary>
    /// Trả về phản hồi NoContent với thông báo
    /// </summary>
    public static IActionResult NoContentResponse(this ControllerBase controller)
    {
        return controller.NoContent();
    }
}
