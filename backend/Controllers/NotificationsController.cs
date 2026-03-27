using System.Security.Claims;
using Jobify.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jobify.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly NotificationService _notificationService;

    public NotificationsController(NotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    private string? GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    // =========================
    // GET ACTIVE NOTIFICATIONS
    // =========================
    [HttpGet]
    public async Task<IActionResult> GetMyNotifications()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var notifications = await _notificationService.GetUserNotificationsAsync(userId);
        return Ok(notifications);
    }

    // =========================
    // GET ARCHIVED NOTIFICATIONS
    // =========================
    [HttpGet("archived")]
    public async Task<IActionResult> GetArchivedNotifications()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var notifications = await _notificationService.GetArchivedNotificationsAsync(userId);
        return Ok(notifications);
    }

    // =========================
    // UNREAD COUNT
    // =========================
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var count = await _notificationService.GetUnreadCountAsync(userId);
        return Ok(new { unreadCount = count });
    }

    // =========================
    // MARK AS READ
    // =========================
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await _notificationService.MarkAsReadAsync(id, userId);
        return NoContent();
    }

    // =========================
    // ARCHIVE NOTIFICATION
    // =========================
    [HttpPut("{id}/archive")]
    public async Task<IActionResult> ArchiveNotification(int id)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await _notificationService.ArchiveAsync(id, userId);
        return NoContent();
    }

    [HttpPut("{id}/unarchive")]
    public async Task<IActionResult> UnarchiveNotification(int id)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await _notificationService.UnarchiveAsync(id, userId);
        return NoContent();
    }

    [HttpPost]
    [Authorize(Roles = "Recruiter,Admin")]
    public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        await _notificationService.CreateNotificationAsync(
            dto.UserId,
            dto.Title,
            dto.Message
        );

        return Ok(new { message = "Notification created successfully." });
    }


}
