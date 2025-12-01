using System.ComponentModel.DataAnnotations;

namespace WebApp.Core.DTOs.Users;

public class UserListItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public IList<string> Roles { get; set; } = new List<string>();
}

public class UpdateUserRolesDto
{
    [Required]
    public IList<string> Roles { get; set; } = new List<string>();
}

public class UpdateUserStatusDto
{
    public bool IsActive { get; set; }
}

public class CreateUserDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [Compare(nameof(Password), ErrorMessage = "Confirm password does not match.")]
    public string ConfirmPassword { get; set; } = string.Empty;

    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// Danh sách role muốn gán cho user mới (tùy chọn).
    /// </summary>
    public IList<string> Roles { get; set; } = new List<string>();
}


