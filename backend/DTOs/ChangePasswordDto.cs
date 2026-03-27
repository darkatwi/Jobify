using System.ComponentModel.DataAnnotations;

namespace Jobify.Api.DTOs.Auth;

public class ChangePasswordDto
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}