using System.ComponentModel.DataAnnotations;

namespace WebApp.Core.Entities;

/// <summary>
/// Quyền chi tiết (permission) được gán cho Role (nhóm quyền).
/// </summary>
public class Permission
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Code { get; set; } = string.Empty; // Ví dụ: CONTENT_VIEW

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty; // Ví dụ: Xem nội dung

    [MaxLength(100)]
    public string Module { get; set; } = string.Empty; // Ví dụ: Content, File, User

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Bảng liên kết Role (IdentityRole) và Permission.
/// </summary>
public class RolePermission
{
    public int Id { get; set; }

    /// <summary>
    /// Id của IdentityRole (string).
    /// </summary>
    [Required]
    public string RoleId { get; set; } = string.Empty;

    public int PermissionId { get; set; }

    public Permission Permission { get; set; } = null!;
}


