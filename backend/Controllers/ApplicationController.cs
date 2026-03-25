using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.Models;
using Jobify.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
// using Jobify.Api.DTOs.Applications;

//application and assesment controller -> the assesment is finished, but needs some work with the snapshots

namespace Jobify.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApplicationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;

    public ApplicationController(AppDbContext db, IHttpClientFactory http, IConfiguration config, IWebHostEnvironment env)
    {
        _db = db;
        _http = http;
        _config = config;
        _env = env;
    }

    private string? CurrentUserId()
        => User.FindFirstValue(ClaimTypes.NameIdentifier);

    private static int SecureSeed()
        => Random.Shared.Next(int.MinValue, int.MaxValue);

    private static List<string> Shuffle(List<string> items, int seed)
    {
        var rng = new Random(seed);
        for (int i = items.Count - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (items[i], items[j]) = (items[j], items[i]);
        }
        return items;
    }

    private static bool IsExpired(ApplicationAssessment attempt)
        => DateTime.UtcNow > attempt.ExpiresAtUtc;

    private static object? MakePublicAssessment(string? assessmentJson, List<string>? questionOrder = null)
    {
        if (string.IsNullOrWhiteSpace(assessmentJson)) return null;

        using var doc = JsonDocument.Parse(assessmentJson);
        var root = doc.RootElement;

        int timeLimitSeconds = root.TryGetProperty("timeLimitSeconds", out var tl) && tl.ValueKind == JsonValueKind.Number
            ? tl.GetInt32()
            : 1800;

        bool randomize = root.TryGetProperty("randomize", out var r) && r.ValueKind == JsonValueKind.True;

        if (!root.TryGetProperty("questions", out var qs) || qs.ValueKind != JsonValueKind.Array)
        {
            return new { timeLimitSeconds, randomize, questions = new List<object>() };
        }

        var map = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in qs.EnumerateArray())
        {
            var id = q.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String ? idEl.GetString() : null;
            if (string.IsNullOrWhiteSpace(id)) continue;

            var type = q.TryGetProperty("type", out var tEl) && tEl.ValueKind == JsonValueKind.String ? tEl.GetString() : "mcq";

            if (string.Equals(type, "mcq", StringComparison.OrdinalIgnoreCase))
            {
                var prompt = q.TryGetProperty("prompt", out var pEl) && pEl.ValueKind == JsonValueKind.String ? pEl.GetString() : "";
                var options = new List<string?>();

                if (q.TryGetProperty("options", out var optEl) && optEl.ValueKind == JsonValueKind.Array)
                    foreach (var o in optEl.EnumerateArray())
                        options.Add(o.ValueKind == JsonValueKind.String ? o.GetString() : null);

                map[id] = new { id, type = "mcq", prompt, options };
            }
            else if (string.Equals(type, "code", StringComparison.OrdinalIgnoreCase))
            {
                var title = q.TryGetProperty("title", out var ti) && ti.ValueKind == JsonValueKind.String ? ti.GetString() : "";
                var prompt = q.TryGetProperty("prompt", out var pEl) && pEl.ValueKind == JsonValueKind.String ? pEl.GetString() : "";
                var starterCode = q.TryGetProperty("starterCode", out var sc) && sc.ValueKind == JsonValueKind.String ? sc.GetString() : "";

                var allowed = new List<int>();
                if (q.TryGetProperty("languageIdsAllowed", out var langs) && langs.ValueKind == JsonValueKind.Array)
                    foreach (var l in langs.EnumerateArray())
                        if (l.ValueKind == JsonValueKind.Number) allowed.Add(l.GetInt32());

                var publicTests = new List<object>();
                if (q.TryGetProperty("publicTests", out var pts) && pts.ValueKind == JsonValueKind.Array)
                {
                    foreach (var pt in pts.EnumerateArray())
                    {
                        var stdin = pt.TryGetProperty("stdin", out var s) && s.ValueKind == JsonValueKind.String ? s.GetString() : "";
                        var expected = pt.TryGetProperty("expected", out var e) && e.ValueKind == JsonValueKind.String ? e.GetString() : "";
                        publicTests.Add(new { stdin, expected });
                    }
                }

                map[id] = new
                {
                    id,
                    type = "code",
                    title,
                    prompt,
                    starterCode,
                    languageIdsAllowed = allowed,
                    publicTests
                };
            }
        }

        var ordered = new List<object>();
        if (questionOrder != null && questionOrder.Count > 0)
        {
            foreach (var qid in questionOrder)
                if (map.TryGetValue(qid, out var pq)) ordered.Add(pq);
        }
        else
        {
            ordered = map.Values.ToList();
        }

        return new { timeLimitSeconds, randomize, questions = ordered };
    }

    private static decimal ComputeMcqScore(string assessmentJson, string answersJson)
    {
        using var assessmentDoc = JsonDocument.Parse(assessmentJson);
        using var answersDoc = JsonDocument.Parse(string.IsNullOrWhiteSpace(answersJson) ? "{}" : answersJson);

        if (!assessmentDoc.RootElement.TryGetProperty("questions", out var qs) || qs.ValueKind != JsonValueKind.Array)
            return 0;

        int totalMcq = 0;
        int correct = 0;

        foreach (var q in qs.EnumerateArray())
        {
            var type = q.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String ? t.GetString() : "mcq";
            if (!string.Equals(type, "mcq", StringComparison.OrdinalIgnoreCase)) continue;

            if (!q.TryGetProperty("id", out var idEl) || idEl.ValueKind != JsonValueKind.String) continue;
            var qid = idEl.GetString();
            if (string.IsNullOrWhiteSpace(qid)) continue;

            if (!q.TryGetProperty("correctIndex", out var cEl) || cEl.ValueKind != JsonValueKind.Number) continue;
            var correctIndex = cEl.GetInt32();

            totalMcq++;

            if (answersDoc.RootElement.TryGetProperty(qid, out var chosen) &&
                chosen.ValueKind == JsonValueKind.Number &&
                chosen.GetInt32() == correctIndex)
            {
                correct++;
            }
        }

        if (totalMcq == 0) return 0;
        return Math.Round((decimal)correct * 100m / totalMcq, 2);
    }

    //DTOs
    public class MyApplicationDto
    {
        public int ApplicationId { get; set; }
        public int OpportunityId { get; set; }
        public string OpportunityTitle { get; set; } = "";
        public string CompanyName { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime CreatedAtUtc { get; set; }
        public bool HasAssessment { get; set; }
    }

    public class StartAssessmentDto
    {
        public bool WebcamConsent { get; set; }
    }

    public class SaveAssessmentDto
    {
        public object? Answers { get; set; }
    }

    public class ProctorEventDto
    {
        public string Type { get; set; } = "";
        public object? Details { get; set; }
    }

    public class RunCodeDto
    {
        public string QuestionId { get; set; } = "";
        public int LanguageId { get; set; }
        public string SourceCode { get; set; } = "";
        public string? StdinOverride { get; set; }
    }

    public class SnapshotDto
    {
        public string Base64Jpeg { get; set; } = "";
    }

    public class RecruiterApplicantProfileDto
    {
        public int ApplicationId { get; set; }
        public int OpportunityId { get; set; }
        public string OpportunityTitle { get; set; } = "";
        public string Status { get; set; } = "";
        public string? Note { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }

        public string StudentUserId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string? PhoneNumber { get; set; }
        public string? Location { get; set; }
        public string? Bio { get; set; }
        public string? University { get; set; }
        public string? Major { get; set; }
        public string? GraduationYear { get; set; }

        public bool HasResume { get; set; }
        public string? ResumeFileName { get; set; }
        public bool HasUniversityProof { get; set; }
        public string? UniversityProofFileName { get; set; }

        public List<string> Skills { get; set; } = new();
        public List<object> Education { get; set; } = new();
        public List<object> Experience { get; set; } = new();
        public List<object> Projects { get; set; } = new();
        public List<string> Interests { get; set; } = new();

        public decimal? AssessmentScore { get; set; }
        public bool? Flagged { get; set; }
        public string? FlagReason { get; set; }
    }

    [Authorize(Roles = "Student")]
    [HttpGet("me")]
    public async Task<ActionResult<List<MyApplicationDto>>> GetMyApplications()
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var apps = await _db.Applications
            .AsNoTracking()
            .Include(a => a.Opportunity)
            .Where(a =>
                (a.UserId == userId || a.StudentUserId == userId) &&
                a.Status != ApplicationStatus.Withdrawn)
            .OrderByDescending(a => a.CreatedAtUtc)
            .Select(a => new MyApplicationDto
            {
                ApplicationId = a.Id,
                OpportunityId = a.OpportunityId,
                OpportunityTitle = a.Opportunity.Title,
                CompanyName = a.Opportunity.CompanyName,
                Status = a.Status.ToString(),
                CreatedAtUtc = a.CreatedAtUtc,
                HasAssessment = a.Opportunity.AssessmentJson != null && a.Opportunity.AssessmentJson != ""
            })
            .ToListAsync();

        return Ok(apps);
    }

    [Authorize(Roles = "Student")]
    [HttpGet("{applicationId:int}")]
    public async Task<IActionResult> GetMyApplication(int applicationId)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var app = await _db.Applications
            .AsNoTracking()
            .Include(a => a.Opportunity)
            .FirstOrDefaultAsync(a =>
                a.Id == applicationId &&
                (a.UserId == userId || a.StudentUserId == userId));

        if (app == null) return NotFound();

        var attempt = await _db.ApplicationAssessments
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ApplicationId == app.Id);

        List<string>? order = null;
        if (attempt != null && !string.IsNullOrWhiteSpace(attempt.QuestionOrderJson))
        {
            try { order = JsonSerializer.Deserialize<List<string>>(attempt.QuestionOrderJson); } catch { }
        }

        object? savedAnswers = null;
        if (attempt != null && !string.IsNullOrWhiteSpace(attempt.AnswersJson))
        {
            try { savedAnswers = JsonSerializer.Deserialize<object>(attempt.AnswersJson); } catch { }
        }

        return Ok(new
        {
            applicationId = app.Id,
            opportunityId = app.OpportunityId,
            status = app.Status.ToString(),
            createdAtUtc = app.CreatedAtUtc,

            hasAssessment = !string.IsNullOrWhiteSpace(app.Opportunity.AssessmentJson),
            assessment = MakePublicAssessment(app.Opportunity.AssessmentJson, order),

            attempt = attempt == null ? null : new
            {
                attemptId = attempt.Id,
                attempt.StartedAtUtc,
                attempt.ExpiresAtUtc,
                attempt.SubmittedAtUtc,
                attempt.Score,
                attempt.WebcamConsent,
                attempt.Flagged,
                attempt.FlagReason,
                mcqCount = attempt.McqCountSnapshot,
                challengeCount = attempt.ChallengeCountSnapshot,
                timeLimitSeconds = attempt.TimeLimitSeconds,
                savedAnswers
            }
        });
    }

    [Authorize(Roles = "Student")]
    [HttpPost("{applicationId:int}/assessment/start")]
    public async Task<IActionResult> StartAssessment(int applicationId, [FromBody] StartAssessmentDto dto)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var app = await _db.Applications
            .Include(a => a.Opportunity)
            .FirstOrDefaultAsync(a =>
                a.Id == applicationId &&
                (a.UserId == userId || a.StudentUserId == userId));

        if (app == null) return NotFound();
        if (app.Status == ApplicationStatus.Withdrawn) return BadRequest("Application is withdrawn.");

        if (string.IsNullOrWhiteSpace(app.Opportunity.AssessmentJson))
            return BadRequest("This opportunity has no assessment.");

        var existing = await _db.ApplicationAssessments
            .FirstOrDefaultAsync(x => x.ApplicationId == app.Id);

        if (existing != null)
        {
            if (existing.SubmittedAtUtc != null)
                return Ok(new { attemptId = existing.Id, alreadySubmitted = true, expiresAtUtc = existing.ExpiresAtUtc });

            if (IsExpired(existing))
            {
                _db.ApplicationAssessments.Remove(existing);
                await _db.SaveChangesAsync();
            }
            else
            {
                app.Status = ApplicationStatus.InAssessment;
                existing.WebcamConsent = dto.WebcamConsent;
                await _db.SaveChangesAsync();

                return Ok(new { attemptId = existing.Id, expiresAtUtc = existing.ExpiresAtUtc });
            }
        }

        int timeLimitSeconds = 1800;
        bool randomize = true;
        var questionIds = new List<string>();

        int mcqCount = 0;
        int challengeCount = 0;

        using (var doc = JsonDocument.Parse(app.Opportunity.AssessmentJson))
        {
            var root = doc.RootElement;

            if (root.TryGetProperty("timeLimitSeconds", out var tl) && tl.ValueKind == JsonValueKind.Number)
                timeLimitSeconds = tl.GetInt32();

            if (root.TryGetProperty("randomize", out var r) &&
                (r.ValueKind == JsonValueKind.True || r.ValueKind == JsonValueKind.False))
                randomize = r.ValueKind == JsonValueKind.True;

            if (root.TryGetProperty("questions", out var qs) && qs.ValueKind == JsonValueKind.Array)
            {
                foreach (var q in qs.EnumerateArray())
                {
                    if (q.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String)
                    {
                        var id = idEl.GetString();
                        if (!string.IsNullOrWhiteSpace(id)) questionIds.Add(id!);
                    }

                    var type = q.TryGetProperty("type", out var tEl) && tEl.ValueKind == JsonValueKind.String
                        ? tEl.GetString()
                        : "mcq";

                    if (string.Equals(type, "mcq", StringComparison.OrdinalIgnoreCase)) mcqCount++;
                    else if (string.Equals(type, "code", StringComparison.OrdinalIgnoreCase)) challengeCount++;
                }
            }
        }

        if (questionIds.Count == 0) return BadRequest("Assessment has no questions.");

        var seed = SecureSeed();
        var order = randomize ? Shuffle(questionIds, seed) : questionIds;

        app.Status = ApplicationStatus.InAssessment;

        var attempt = new ApplicationAssessment
        {
            ApplicationId = app.Id,
            AnswersJson = "{}",
            StartedAtUtc = DateTime.UtcNow,
            TimeLimitSeconds = timeLimitSeconds,
            ExpiresAtUtc = DateTime.UtcNow.AddSeconds(timeLimitSeconds),
            McqCountSnapshot = mcqCount,
            ChallengeCountSnapshot = challengeCount,
            RandomSeed = seed,
            QuestionOrderJson = JsonSerializer.Serialize(order),
            WebcamConsent = dto.WebcamConsent,
            CopyPasteCount = 0,
            TabSwitchCount = 0,
            SuspiciousCount = 0,
            Flagged = false
        };

        _db.ApplicationAssessments.Add(attempt);
        await _db.SaveChangesAsync();

        return Ok(new { attemptId = attempt.Id, expiresAtUtc = attempt.ExpiresAtUtc });
    }


    // Save answers
    [Authorize(Roles = "Student")]
    [HttpPut("{applicationId:int}/assessment")]
    public async Task<IActionResult> SaveAssessment(int applicationId, [FromBody] SaveAssessmentDto dto)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var attempt = await _db.ApplicationAssessments
            .Include(x => x.Application)
            .FirstOrDefaultAsync(x =>
                x.ApplicationId == applicationId &&
                (x.Application.UserId == userId || x.Application.StudentUserId == userId));

        if (attempt == null) return NotFound("Assessment not started.");
        if (attempt.SubmittedAtUtc != null) return BadRequest("Already submitted.");
        if (IsExpired(attempt)) return BadRequest("Time is up.");

        attempt.AnswersJson = JsonSerializer.Serialize(dto.Answers ?? new { });
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Proctor event (copy/paste/tab switching)
    // Proctor event (copy/paste/tab switching)
    [Authorize(Roles = "Student")]
    [HttpPost("{applicationId:int}/assessment/proctor-event")]
    public async Task<IActionResult> ProctorEvent(int applicationId, [FromBody] ProctorEventDto dto)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var attempt = await _db.ApplicationAssessments
            .Include(x => x.Application)
            .FirstOrDefaultAsync(x =>
                x.ApplicationId == applicationId &&
                (x.Application.UserId == userId || x.Application.StudentUserId == userId));

        if (attempt == null) return NotFound("Assessment not started.");
        if (attempt.SubmittedAtUtc != null) return NoContent();

        _db.ProctorEvents.Add(new ProctorEvent
        {
            ApplicationAssessmentId = attempt.Id,
            Type = dto.Type?.Trim() ?? "",
            Details = dto.Details == null ? null : JsonSerializer.Serialize(dto.Details),
            CreatedAtUtc = DateTime.UtcNow
        });

        var t = (dto.Type ?? "").Trim().ToUpperInvariant();

        bool isTabEvent = t is "TAB_BLUR" or "VISIBILITY_HIDDEN" or "WINDOW_BLUR";
        bool isCopyEvent = t is "COPY" or "PASTE" or "CUT";
        bool isSuspicious = t is "DEVTOOLS" or "UNUSUAL_BEHAVIOR";

        if (isCopyEvent) attempt.CopyPasteCount++;
        if (isTabEvent) attempt.TabSwitchCount++;
        if (isSuspicious) attempt.SuspiciousCount++;

        var warnTabAt = 1;
        var flagTabAt = 3;

        string? message = null;

        if (isTabEvent && !attempt.Flagged)
        {
            if (attempt.TabSwitchCount >= warnTabAt && attempt.TabSwitchCount < flagTabAt)
            {
                message = $"Please avoid switching tabs. ({attempt.TabSwitchCount}/{flagTabAt}) — you may be flagged.";
            }
        }

        if (!attempt.Flagged)
        {
            if (attempt.TabSwitchCount >= flagTabAt)
            {
                attempt.Flagged = true;
                attempt.FlagReason = "Too many tab switches.";
                message = "You have been flagged due to too many tab switches. Please stay on the assessment page.";
            }
            else if (attempt.CopyPasteCount >= 5)
            {
                attempt.Flagged = true;
                attempt.FlagReason = "Too many copy/paste events.";
                message = "You have been flagged due to excessive copy/paste activity.";
            }
            else if (attempt.SuspiciousCount >= 2)
            {
                attempt.Flagged = true;
                attempt.FlagReason = "Suspicious behavior detected.";
                message = "You have been flagged due to suspicious behavior.";
            }
        }

        await _db.SaveChangesAsync();

        if (attempt.Flagged)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                flagged = attempt.Flagged,
                flagReason = attempt.FlagReason,
                tabSwitchCount = attempt.TabSwitchCount,
                copyPasteCount = attempt.CopyPasteCount,
                message
            });
        }

        return Ok(new
        {
            flagged = attempt.Flagged,
            flagReason = attempt.FlagReason,
            tabSwitchCount = attempt.TabSwitchCount,
            copyPasteCount = attempt.CopyPasteCount,
            message
        });
    }

    // Webcam snapshot upload 
    [Authorize(Roles = "Student")]
    [HttpPost("{applicationId:int}/assessment/snapshot")]
    public async Task<IActionResult> UploadSnapshot(int applicationId, [FromBody] SnapshotDto dto)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var attempt = await _db.ApplicationAssessments
            .Include(x => x.Application)
            .FirstOrDefaultAsync(x =>
                x.ApplicationId == applicationId &&
                (x.Application.UserId == userId || x.Application.StudentUserId == userId));

        if (attempt == null) return NotFound("Assessment not started.");
        if (!attempt.WebcamConsent) return BadRequest("No webcam consent.");
        if (attempt.SubmittedAtUtc != null) return NoContent();

        var b64 = dto.Base64Jpeg ?? "";
        if (b64.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            var comma = b64.IndexOf(',');
            if (comma >= 0) b64 = b64[(comma + 1)..];
        }

        byte[] bytes;
        try { bytes = Convert.FromBase64String(b64); }
        catch { return BadRequest("Invalid base64."); }

        var dir = Path.Combine(_env.ContentRootPath, "Snapshots");
        Directory.CreateDirectory(dir);

        var filename = $"app{applicationId}_attempt{attempt.Id}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.jpg";
        var path = Path.Combine(dir, filename);

        await System.IO.File.WriteAllBytesAsync(path, bytes);

        _db.ProctorEvents.Add(new ProctorEvent
        {
            ApplicationAssessmentId = attempt.Id,
            Type = "WEBCAM_SNAPSHOT",
            Details = JsonSerializer.Serialize(new { saved = true, file = filename }),
            CreatedAtUtc = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new { saved = true });
    }
    // Judge0: RUN code against PUBLIC tests only
    [Authorize(Roles = "Student")]
    [HttpPost("{applicationId:int}/assessment/run")]
    public async Task<IActionResult> RunCode(int applicationId, [FromBody] RunCodeDto dto)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var attempt = await _db.ApplicationAssessments
            .Include(x => x.Application)
                .ThenInclude(a => a.Opportunity)
            .FirstOrDefaultAsync(x =>
                x.ApplicationId == applicationId &&
                (x.Application.UserId == userId || x.Application.StudentUserId == userId));

        if (attempt == null) return NotFound("Assessment not started.");
        if (attempt.SubmittedAtUtc != null) return BadRequest("Already submitted.");
        if (IsExpired(attempt)) return BadRequest("Time is up.");

        var assessmentJson = attempt.Application.Opportunity.AssessmentJson;
        if (string.IsNullOrWhiteSpace(assessmentJson)) return BadRequest("No assessment.");

        JsonElement? codeQuestion = null;

        using (var doc = JsonDocument.Parse(assessmentJson))
        {
            var root = doc.RootElement;

            if (root.TryGetProperty("questions", out var qs) && qs.ValueKind == JsonValueKind.Array)
            {
                foreach (var q in qs.EnumerateArray())
                {
                    var id = q.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String ? idEl.GetString() : null;
                    var type = q.TryGetProperty("type", out var tEl) && tEl.ValueKind == JsonValueKind.String ? tEl.GetString() : null;

                    if (string.Equals(type, "code", StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(id, dto.QuestionId, StringComparison.OrdinalIgnoreCase))
                    {
                        codeQuestion = q.Clone();
                        break;
                    }
                }
            }
        }

        if (codeQuestion == null) return BadRequest("Invalid code questionId.");

        var qEl = codeQuestion.Value;

        var allowed = new HashSet<int>();
        if (qEl.TryGetProperty("languageIdsAllowed", out var langs) && langs.ValueKind == JsonValueKind.Array)
        {
            foreach (var l in langs.EnumerateArray())
                if (l.ValueKind == JsonValueKind.Number) allowed.Add(l.GetInt32());
        }

        if (allowed.Count > 0 && !allowed.Contains(dto.LanguageId))
            return BadRequest("Language not allowed for this question.");

        if (!string.IsNullOrWhiteSpace(dto.StdinOverride))
        {
            var res = await Judge0Submit(dto.SourceCode, dto.LanguageId, dto.StdinOverride!, expectedOutput: "");
            return Ok(new
            {
                mode = "custom",
                results = new[]
                {
                new {
                    stdin = dto.StdinOverride,
                    expected = (string?)null,
                    stdout = res["stdout"],
                    stderr = res["stderr"],
                    compile_output = res["compile_output"],
                    message = res["message"],
                    status = res["status"]
                }
            }
            });
        }

        var results = new List<object>();

        if (qEl.TryGetProperty("publicTests", out var pts) && pts.ValueKind == JsonValueKind.Array)
        {
            foreach (var pt in pts.EnumerateArray())
            {
                var stdin = pt.TryGetProperty("stdin", out var s) && s.ValueKind == JsonValueKind.String ? s.GetString() ?? "" : "";
                var expected = pt.TryGetProperty("expected", out var e) && e.ValueKind == JsonValueKind.String ? e.GetString() ?? "" : "";

                var res = await Judge0Submit(dto.SourceCode, dto.LanguageId, stdin, expected);

                results.Add(new
                {
                    stdin,
                    expected,
                    stdout = res["stdout"],
                    stderr = res["stderr"],
                    compile_output = res["compile_output"],
                    message = res["message"],
                    status = res["status"]
                });
            }
        }

        return Ok(new
        {
            mode = "public",
            results
        });
    }


    // Submit assessment:
    // - enforce time
    // - grade MCQ
    // - grade CODE using HIDDEN tests via Judge0
    [Authorize(Roles = "Student")]
    [HttpPost("{applicationId:int}/assessment/submit")]
    public async Task<IActionResult> Submit(int applicationId)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var attempt = await _db.ApplicationAssessments
            .Include(x => x.Application)
                .ThenInclude(a => a.Opportunity)
            .FirstOrDefaultAsync(x =>
                x.ApplicationId == applicationId &&
                (x.Application.UserId == userId || x.Application.StudentUserId == userId));

        if (attempt == null) return NotFound("Assessment not started.");
        if (attempt.SubmittedAtUtc != null) return BadRequest("Already submitted.");

        if (IsExpired(attempt))
            return BadRequest("Time is up.");

        var assessmentJson = attempt.Application.Opportunity.AssessmentJson;
        if (string.IsNullOrWhiteSpace(assessmentJson)) return BadRequest("No assessment.");

        JsonElement answersRoot;
        try
        {
            using var ansDoc = JsonDocument.Parse(string.IsNullOrWhiteSpace(attempt.AnswersJson) ? "{}" : attempt.AnswersJson);
            answersRoot = ansDoc.RootElement.Clone();
        }
        catch
        {
            answersRoot = JsonDocument.Parse("{}").RootElement.Clone();
        }

        var mcqScore = ComputeMcqScore(assessmentJson, attempt.AnswersJson);
        var (codeScore, codeDetails) = await GradeCodeQuestions(assessmentJson, answersRoot);
        var hasMcq = HasQuestionType(assessmentJson, "mcq");
        var hasCode = HasQuestionType(assessmentJson, "code");

        decimal finalScore;
        if (hasMcq && hasCode) finalScore = Math.Round((mcqScore * 0.5m) + (codeScore * 0.5m), 2);
        else if (hasCode) finalScore = codeScore;
        else finalScore = mcqScore;

        attempt.Score = finalScore;
        attempt.SubmittedAtUtc = DateTime.UtcNow;

        attempt.Application.Status = ApplicationStatus.Submitted;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            status = attempt.Application.Status.ToString(),
            finalScore,
            mcqScore,
            codeScore,
            codeDetails,
            flagged = attempt.Flagged,
            flagReason = attempt.FlagReason
        });
    }

    private static bool HasQuestionType(string assessmentJson, string typeWanted)
    {
        using var doc = JsonDocument.Parse(assessmentJson);
        if (!doc.RootElement.TryGetProperty("questions", out var qs) || qs.ValueKind != JsonValueKind.Array) return false;
        foreach (var q in qs.EnumerateArray())
        {
            var type = q.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String ? t.GetString() : null;
            if (string.Equals(type, typeWanted, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    private async Task<(decimal score, object details)> GradeCodeQuestions(string assessmentJson, JsonElement answersRoot)
    {
        using var doc = JsonDocument.Parse(assessmentJson);
        var root = doc.RootElement;

        if (!root.TryGetProperty("questions", out var qs) || qs.ValueKind != JsonValueKind.Array)
            return (0, new { });

        int totalCodeQuestions = 0;
        int totalHiddenTests = 0;
        int passedHiddenTests = 0;

        var perQuestion = new List<object>();

        foreach (var q in qs.EnumerateArray())
        {
            var type = q.TryGetProperty("type", out var tEl) && tEl.ValueKind == JsonValueKind.String ? tEl.GetString() : "";
            if (!string.Equals(type, "code", StringComparison.OrdinalIgnoreCase)) continue;

            var qid = q.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String ? idEl.GetString() : null;
            if (string.IsNullOrWhiteSpace(qid)) continue;

            totalCodeQuestions++;

            int languageId = 0;
            string sourceCode = "";

            if (answersRoot.ValueKind == JsonValueKind.Object && answersRoot.TryGetProperty(qid!, out var aEl) && aEl.ValueKind == JsonValueKind.Object)
            {
                if (aEl.TryGetProperty("languageId", out var l) && l.ValueKind == JsonValueKind.Number) languageId = l.GetInt32();
                if (aEl.TryGetProperty("code", out var c) && c.ValueKind == JsonValueKind.String) sourceCode = c.GetString() ?? "";
            }

            if (languageId == 0 || string.IsNullOrWhiteSpace(sourceCode))
            {
                perQuestion.Add(new { questionId = qid, passed = 0, total = 0, error = "No code submitted." });
                continue;
            }
            int qTotal = 0;
            int qPassed = 0;

            if (q.TryGetProperty("hiddenTests", out var hts) && hts.ValueKind == JsonValueKind.Array)
            {
                foreach (var ht in hts.EnumerateArray())
                {
                    var stdin = ht.TryGetProperty("stdin", out var s) && s.ValueKind == JsonValueKind.String ? s.GetString() ?? "" : "";
                    var expected = ht.TryGetProperty("expected", out var e) && e.ValueKind == JsonValueKind.String ? e.GetString() ?? "" : "";

                    if (stdin == null) stdin = "";
                    if (expected == null) expected = "";

                    qTotal++;
                    totalHiddenTests++;

                    var res = await Judge0Submit(sourceCode, languageId, stdin, expected);

                    var ok = false;
                    if (res.TryGetValue("status", out var stObj) && stObj is string st)
                    {
                        ok = st.Equals("Accepted", StringComparison.OrdinalIgnoreCase);
                    }

                    if (ok)
                    {
                        qPassed++;
                        passedHiddenTests++;
                    }
                }
            }

            perQuestion.Add(new { questionId = qid, passed = qPassed, total = qTotal });
        }

        if (totalHiddenTests == 0) return (0, new { perQuestion });

        var score = Math.Round((decimal)passedHiddenTests * 100m / totalHiddenTests, 2);
        return (score, new { perQuestion, passedHiddenTests, totalHiddenTests });
    }
    private static string Norm(string? s)
    {
        if (s == null) return "";
        return s.Replace("\r\n", "\n").TrimEnd();
    }

    private async Task<Dictionary<string, object?>> Judge0Submit(
        string sourceCode,
        int languageId,
        string stdin,
        string expectedOutput
    )
    {
        var baseUrl = _config["Judge0:BaseUrl"]?.Trim();
        if (string.IsNullOrWhiteSpace(baseUrl))
            throw new InvalidOperationException("Judge0:BaseUrl is not configured.");

        var client = _http.CreateClient();
        var payload = new
        {
            source_code = sourceCode,
            language_id = languageId,
            stdin = stdin
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var url = $"{baseUrl.TrimEnd('/')}/submissions?base64_encoded=false&wait=true";
        var resp = await client.PostAsync(url, content);
        var body = await resp.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        string status = "";
        if (root.TryGetProperty("status", out var st) && st.ValueKind == JsonValueKind.Object)
        {
            if (st.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String)
                status = d.GetString() ?? "";
        }

        string? stdout = root.TryGetProperty("stdout", out var o) && o.ValueKind == JsonValueKind.String ? o.GetString() : null;
        string? stderr = root.TryGetProperty("stderr", out var e) && e.ValueKind == JsonValueKind.String ? e.GetString() : null;
        string? compile = root.TryGetProperty("compile_output", out var c) && c.ValueKind == JsonValueKind.String ? c.GetString() : null;
        string? message = root.TryGetProperty("message", out var m) && m.ValueKind == JsonValueKind.String ? m.GetString() : null;
        var normExp = Norm(expectedOutput);
        var normOut = Norm(stdout);

        var finalStatus = status;

        var isError =
            !string.IsNullOrWhiteSpace(compile) ||
            !string.IsNullOrWhiteSpace(stderr) ||
            status.Contains("Error", StringComparison.OrdinalIgnoreCase) ||
            status.Contains("Time Limit", StringComparison.OrdinalIgnoreCase);

        if (!isError && !string.IsNullOrEmpty(normExp))
        {
            finalStatus = (normOut == normExp) ? "Accepted" : "Wrong Answer";
        }

        return new Dictionary<string, object?>
        {
            ["status"] = finalStatus,
            ["stdout"] = stdout,
            ["stderr"] = stderr,
            ["compile_output"] = compile,
            ["message"] = message,
            ["expected"] = expectedOutput
        };
    }


    [Authorize(Roles = "Student")]
    [HttpPost("{applicationId:int}/assessment/reset")]
    public async Task<IActionResult> ResetAssessment(int applicationId)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var app = await _db.Applications
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.UserId == userId);

        if (app == null) return NotFound();

        var attempt = await _db.ApplicationAssessments
            .FirstOrDefaultAsync(x => x.ApplicationId == applicationId);

        if (attempt != null)
            _db.ApplicationAssessments.Remove(attempt);

        app.Status = ApplicationStatus.Draft;
        await _db.SaveChangesAsync();

        return Ok(new { reset = true });
    }




    public class RecruiterAppListDto
    {
        public int ApplicationId { get; set; }
        public string CandidateName { get; set; } = "";
        public string CandidateEmail { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
        public bool HasAssessment { get; set; }
        public decimal? AssessmentScore { get; set; }
        public string? Note { get; set; }
        public int MatchPercentage { get; set; }
        public DateTime? InterviewScheduledAtUtc { get; set; }
        public bool HasActiveInterview { get; set; }
        public string UserId { get; set; } = "";
    }

    public class ResendRejectionDto
    {
        public string? RejectionReason { get; set; }
    }

    [Authorize(Roles = "Recruiter")]
    [HttpGet("recruiter/opportunity/{opportunityId:int}")]
    public async Task<ActionResult<List<RecruiterAppListDto>>> GetApplicationsForOpportunity(int opportunityId)
    {
        var recruiterId = CurrentUserId();
        if (string.IsNullOrEmpty(recruiterId))
            return Unauthorized();

        var opp = await _db.Opportunities
            .AsNoTracking()
            .Include(o => o.OpportunitySkills)
                .ThenInclude(os => os.Skill)
            .FirstOrDefaultAsync(o => o.Id == opportunityId);

        if (opp == null)
            return NotFound("Opportunity not found.");

        if (opp.RecruiterUserId != recruiterId)
            return Forbid();

        var opportunitySkills = opp.OpportunitySkills
            .Where(os => os.Skill != null && !string.IsNullOrWhiteSpace(os.Skill.Name))
            .Select(os => os.Skill!.Name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var apps = await _db.Applications
            .AsNoTracking()
            .Include(a => a.Opportunity)
            .Where(a => a.OpportunityId == opportunityId && a.Status != ApplicationStatus.Withdrawn)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync();

        var result = new List<RecruiterAppListDto>();

        foreach (var app in apps)
        {
            var candidateUserId = !string.IsNullOrWhiteSpace(app.UserId)
                ? app.UserId
                : app.StudentUserId;

            var user = string.IsNullOrWhiteSpace(candidateUserId)
                ? null
                : await _db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == candidateUserId);

            var student = string.IsNullOrWhiteSpace(candidateUserId)
                ? null
                : await _db.StudentProfiles.AsNoTracking()
                    .FirstOrDefaultAsync(s => s.UserId == candidateUserId);

            var assessment = await _db.ApplicationAssessments
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ApplicationId == app.Id);

            var studentSkills = string.IsNullOrWhiteSpace(candidateUserId)
                ? new List<string>()
                : await _db.StudentSkills
                    .AsNoTracking()
                    .Where(ss => ss.StudentUserId == candidateUserId && ss.SkillId != null)
                    .Join(
                        _db.Skills,
                        ss => ss.SkillId,
                        s => s.Id,
                        (ss, s) => s.Name
                    )
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Select(name => name.Trim())
                    .Distinct()
                    .ToListAsync();
            var latestInterview = await _db.Interviews
    .AsNoTracking()
    .Where(i => i.ApplicationId == app.Id && !i.IsCancelled)
    .OrderByDescending(i => i.ScheduledAtUtc)
    .FirstOrDefaultAsync();

            var hasActiveInterview =
                latestInterview != null &&
                latestInterview.ScheduledAtUtc.AddHours(1) > DateTime.UtcNow;

            var matchPercentage = CalculateMatchPercentage(studentSkills, opportunitySkills);

            result.Add(new RecruiterAppListDto
            {
                ApplicationId = app.Id,
                UserId = candidateUserId,
                CandidateName =
        !string.IsNullOrWhiteSpace(student?.FullName) ? student.FullName! :
        !string.IsNullOrWhiteSpace(student?.Email) ? student.Email.Split('@')[0] :
        !string.IsNullOrWhiteSpace(user?.UserName) ? user.UserName! :
        !string.IsNullOrWhiteSpace(user?.Email) ? user.Email!.Split('@')[0] :
        "Unknown",
                CandidateEmail =
        !string.IsNullOrWhiteSpace(student?.Email) ? student.Email :
        !string.IsNullOrWhiteSpace(user?.Email) ? user.Email! :
        "No email",
                Status = app.Status.ToString(),
                CreatedAtUtc = app.CreatedAtUtc,
                UpdatedAtUtc = app.UpdatedAtUtc,
                HasAssessment = !string.IsNullOrWhiteSpace(app.Opportunity?.AssessmentJson),
                AssessmentScore = assessment?.Score,
                Note = app.Note,
                MatchPercentage = matchPercentage,
                InterviewScheduledAtUtc = latestInterview?.ScheduledAtUtc,
                HasActiveInterview = hasActiveInterview
            });
        }

        return Ok(result);
    }

    // ── PATCH /api/applications/{applicationId}/status ────────────────────────
    // PB_19: update application status
    // PB_24: auto-send rejection email when status = Rejected + SendEmail = true
    [Authorize(Roles = "Recruiter")]
    [HttpPatch("{applicationId:int}/status")]
    public async Task<IActionResult> UpdateApplicationStatus(
    int applicationId,
    [FromBody] UpdateApplicationStatusDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Status))
            return BadRequest("Status is required.");

        var normalizedStatus = dto.Status?.Trim().Replace(" ", "");

        if (!Enum.TryParse<ApplicationStatus>(normalizedStatus, ignoreCase: true, out var newStatus))
        {
            var valid = string.Join(", ", Enum.GetNames<ApplicationStatus>());
            return BadRequest($"Invalid status. Valid values: {valid}");
        }

        var app = await _db.Applications
            .Include(a => a.Opportunity)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (app == null) return NotFound("Application not found.");

        var previousStatus = app.Status;
        app.Status = newStatus;
        app.UpdatedAtUtc = DateTime.UtcNow;

        if (dto.Note != null)
            app.Note = dto.Note.Trim();

        await _db.SaveChangesAsync();

        // ── PB_24 rejection email ─────────────────────────────────────────────
        string? emailError = null;
        bool emailSent = false;

        if (newStatus == ApplicationStatus.Rejected && dto.SendEmail)
        {
            var user = await _db.Users.FindAsync(app.UserId);
            if (user?.Email != null)
            {
                try
                {
                    var oppTitle = app.Opportunity?.Title ?? "the position";
                    var companyName = app.Opportunity?.CompanyName ?? "our company";
                    var reason = string.IsNullOrWhiteSpace(dto.RejectionReason)
                                      ? null : dto.RejectionReason.Trim();

                    var htmlBody = BuildRejectionEmail(
                        user.UserName ?? "Candidate", oppTitle, companyName, reason);

                    await SendEmailAsync(
                        user.Email,
                        $"Update on your application – {oppTitle}",
                        htmlBody);

                    emailSent = true;
                }
                catch (Exception ex)
                {
                    emailError = ex.Message;   // status update succeeds even if email fails
                }
            }
        }

        return Ok(new
        {
            applicationId,
            previousStatus = previousStatus.ToString(),
            newStatus = newStatus.ToString(),
            emailSent,
            emailError
        });
    }

    // ── POST /api/applications/{applicationId}/rejection-email ────────────────
    // PB_24: manually (re)send a rejection email at any time
    [Authorize(Roles = "Recruiter")]
    [HttpPost("{applicationId:int}/rejection-email")]
    public async Task<IActionResult> ResendRejectionEmail(
        int applicationId,
        [FromBody] ResendRejectionDto? dto)
    {
        var app = await _db.Applications
            .Include(a => a.Opportunity)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (app == null) return NotFound("Application not found.");

        var user = await _db.Users.FindAsync(app.UserId);
        if (user?.Email == null)
            return BadRequest("Candidate has no email address on file.");

        var oppTitle = app.Opportunity?.Title ?? "the position";
        var companyName = app.Opportunity?.CompanyName ?? "our company";
        var reason = string.IsNullOrWhiteSpace(dto?.RejectionReason)
                          ? null : dto!.RejectionReason!.Trim();

        var htmlBody = BuildRejectionEmail(
            user.UserName ?? "Candidate", oppTitle, companyName, reason);

        try
        {
            await SendEmailAsync(user.Email, $"Update on your application – {oppTitle}", htmlBody);
            return Ok(new { sent = true, to = user.Email });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { sent = false, error = ex.Message });
        }
    }

    // Recruiter updates application status and add note (optional)
    [Authorize(Roles = "Recruiter")]
    [HttpPatch("{applicationId:int}/recruiter")]
    public async Task<IActionResult> RecruiterUpdateApplication(int applicationId, [FromBody] UpdateApplicationStatusDto dto)
    {
        var recruiterId = CurrentUserId();
        if (string.IsNullOrEmpty(recruiterId)) return Unauthorized();

        // recruiter profile
        var recruiter = await _db.RecruiterProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == recruiterId);

        if (recruiter == null)
            return Forbid(); // recruiter role but no profile

        // application + opportunity
        var app = await _db.Applications
            .Include(a => a.Opportunity)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (app == null)
            return NotFound();

        if (app.Opportunity == null)
            return BadRequest("Opportunity not found for this application.");

        // same company check
        if (app.Opportunity.RecruiterUserId != recruiterId)
            return Forbid();

        if (app.Status == ApplicationStatus.Withdrawn)
            return BadRequest("Cannot update a withdrawn application.");

        if (!Enum.TryParse<ApplicationStatus>(dto.Status, true, out var newStatus))
            return BadRequest("Invalid status value.");

        app.Status = newStatus;
        app.Note = dto.Note;
        app.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            applicationId = app.Id,
            status = app.Status.ToString(),
            note = app.Note,
            UpdatedAtUtc = app.UpdatedAtUtc
        });
    }

    // GET my application status + recruiter notes (for dashboard)
    [Authorize(Roles = "Student")]
    [HttpGet("{applicationId:int}/summary")]
    public async Task<IActionResult> GetMyApplicationSummary(int applicationId)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var app = await _db.Applications
            .AsNoTracking()
            .Include(a => a.Opportunity)
            .FirstOrDefaultAsync(a =>
                a.Id == applicationId &&
                (a.UserId == userId || a.StudentUserId == userId));

        if (app == null) return NotFound();

        return Ok(new
        {
            applicationId = app.Id,
            status = app.Status.ToString(),
            note = app.Note,
            UpdatedAtUtc = app.UpdatedAtUtc,
            companyName = app.Opportunity?.CompanyName,
            opportunityTitle = app.Opportunity?.Title
        });
    }


    // GET all applications for recruiter's company
    [Authorize(Roles = "Recruiter")]
    [HttpGet("recruiter/applications")]
    public async Task<IActionResult> GetCompanyApplications()
    {
        var recruiterId = CurrentUserId();
        if (string.IsNullOrEmpty(recruiterId)) return Unauthorized();

        var recruiter = await _db.RecruiterProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == recruiterId);

        if (recruiter == null) return Forbid();

        var apps = await _db.Applications
            .AsNoTracking()
            .Include(a => a.Opportunity)
            .Where(a => a.Opportunity != null &&
                        a.Opportunity.CompanyName.ToLower() == recruiter.CompanyName.ToLower())
            .OrderByDescending(a => a.UpdatedAtUtc)
            .Select(a => new
            {
                applicationId = a.Id,
                opportunityId = a.OpportunityId,
                opportunityTitle = a.Opportunity!.Title,
                studentUserId = a.StudentUserId ?? a.UserId,
                status = a.Status.ToString(),
                note = a.Note,
                UpdatedAtUtc = a.UpdatedAtUtc
            })
            .ToListAsync();

        return Ok(apps);
    }

    // Withdraw application (student)
    [Authorize(Roles = "Student")]
    [HttpPost("{applicationId:int}/withdraw")]
    public async Task<IActionResult> WithdrawApplication(int applicationId)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var app = await _db.Applications
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.UserId == userId);

        if (app == null) return NotFound();

        if (app.Status == ApplicationStatus.Withdrawn)
            return BadRequest("Application already withdrawn.");

        app.Status = ApplicationStatus.Withdrawn;
        app.WithdrawndAt = DateTime.UtcNow;
        app.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            applicationId = app.Id,
            status = app.Status.ToString(),
            withdrawnAtUtc = app.WithdrawndAt
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("by-student/{userId}")]
    public async Task<IActionResult> GetApplicationsByStudent(string userId)
    {
        var applications = await _db.Applications.AsNoTracking()
            .Include(a => a.Opportunity)
            .Where(a => a.UserId == userId && a.Status != ApplicationStatus.Withdrawn)
            .OrderByDescending(a => a.CreatedAtUtc)
            .Select(a => new
            {
                job = a.Opportunity.Title,
                company = a.Opportunity.CompanyName,
                date = a.CreatedAtUtc,
                status = a.Status.ToString()
            })
            .ToListAsync();

        return Ok(applications);
    }

    [Authorize(Roles = "Recruiter")]
    [HttpGet("recruiter/{applicationId:int}")]
    public async Task<IActionResult> GetApplicationWithProfile(int applicationId)
    {
        var recruiterId = CurrentUserId();
        if (string.IsNullOrEmpty(recruiterId)) return Unauthorized();

        var app = await _db.Applications
            .Include(a => a.Opportunity)
            .Include(a => a.Assessment)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (app == null) return NotFound();

        if (app.Opportunity == null || app.Opportunity.RecruiterUserId != recruiterId)
            return Forbid();

        var studentUserId = app.StudentUserId ?? app.UserId;
        if (string.IsNullOrEmpty(studentUserId))
            return Ok(new { app.Id });

        var profile = await _db.StudentProfiles
            .FirstOrDefaultAsync(p => p.UserId == studentUserId);

        var education = await _db.StudentEducations
            .Where(e => e.StudentUserId == studentUserId)
            .OrderByDescending(e => e.GraduationYear)
            .ToListAsync();

        var experience = await _db.StudentExperiences
            .Where(e => e.StudentUserId == studentUserId)
            .OrderByDescending(e => e.Id)
            .ToListAsync();

        var projects = await _db.StudentProjects
            .Where(p => p.StudentUserId == studentUserId)
            .OrderByDescending(p => p.Id)
            .ToListAsync();

        var interests = await _db.StudentInterests
            .Where(i => i.StudentUserId == studentUserId)
            .Select(i => i.Interest)
            .Where(i => !string.IsNullOrWhiteSpace(i))
            .Distinct()
            .ToListAsync();

        var dbSkills = await _db.StudentSkills
            .Where(ss => ss.StudentUserId == studentUserId)
            .Join(
                _db.Skills,
                ss => ss.SkillId,
                s => s.Id,
                (ss, s) => s.Name
            )
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct()
            .ToListAsync();

        var projectTechSkills = projects
            .SelectMany(p => SplitSkills(p.TechStack))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var skills = dbSkills
            .Concat(projectTechSkills)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x)
            .ToList();

        var dto = new
        {
            applicationId = app.Id,
            userId = studentUserId,
            opportunityTitle = app.Opportunity.Title,
            status = app.Status.ToString(),
            createdAtUtc = app.CreatedAtUtc,

            fullName = profile?.FullName,
            email = profile?.Email,
            phoneNumber = profile?.PhoneNumber,
            location = profile?.Location,
            bio = profile?.Bio,
            university = profile?.University,
            major = profile?.Major,
            portfolioUrl = profile?.PortfolioUrl,

            educationText = profile?.EducationText,
            experienceText = profile?.ExperienceText,
            projectsText = profile?.ProjectsText,
            interestsText = profile?.InterestsText,
            certificationsText = profile?.CertificationsText,
            awardsText = profile?.AwardsText,

            resumeFileName = profile?.ResumeFileName,
            universityProofFileName = profile?.UniversityProofFileName,

            education,
            experience,
            projects,
            interests,
            skills,

            assessmentScore = app.Assessment?.Score,
            flagged = app.Assessment?.Flagged,
            flagReason = app.Assessment?.FlagReason
        };

        return Ok(dto);
    }

    private static List<string> SplitSkills(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return new List<string>();

        return value
            .Split(new[] { ',', '\n', ';', '|', '/' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        var smtpHost = _config["Smtp:Host"];
        var smtpPort = int.Parse(_config["Smtp:Port"] ?? "587");
        var smtpUser = _config["Smtp:User"];
        var smtpPass = _config["Smtp:Pass"];
        var fromEmail = _config["Smtp:From"] ?? smtpUser;

        using var client = new System.Net.Mail.SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new System.Net.NetworkCredential(smtpUser, smtpPass),
            EnableSsl = true
        };

        var mail = new System.Net.Mail.MailMessage
        {
            From = new System.Net.Mail.MailAddress(fromEmail!),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        mail.To.Add(to);

        await client.SendMailAsync(mail);
    }

    private static int CalculateMatchPercentage(
    List<string> studentSkills,
    List<string> opportunitySkills)
    {
        if (opportunitySkills == null || opportunitySkills.Count == 0)
            return 0;

        if (studentSkills == null || studentSkills.Count == 0)
            return 0;

        var studentSet = new HashSet<string>(
            studentSkills.Select(s => s.Trim().ToLower())
        );

        var opportunitySet = new HashSet<string>(
            opportunitySkills.Select(s => s.Trim().ToLower())
        );

        var matched = opportunitySet.Count(skill => studentSet.Contains(skill));

        var percentage = (int)Math.Round(
            (double)matched / opportunitySet.Count * 100
        );

        return percentage;
    }

    [Authorize(Roles = "Recruiter")]
    [HttpGet("student-file")]
    public async Task<IActionResult> GetStudentFile([FromQuery] string userId, [FromQuery] string fileName)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(fileName))
            return BadRequest();

        var fullPath = Path.Combine(_env.ContentRootPath, "Uploads", "Students", userId, fileName);

        if (!System.IO.File.Exists(fullPath))
            return NotFound();

        var ext = Path.GetExtension(fileName).ToLowerInvariant();

        var contentType = ext switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };

        var bytes = await System.IO.File.ReadAllBytesAsync(fullPath);
        return File(bytes, contentType, fileName);
    }

    private static string BuildRejectionEmail(
        string candidateName,
        string opportunityTitle,
        string companyName,
        string? reason)
    {
        var encodedName = System.Web.HttpUtility.HtmlEncode(candidateName);
        var encodedTitle = System.Web.HttpUtility.HtmlEncode(opportunityTitle);
        var encodedCompany = System.Web.HttpUtility.HtmlEncode(companyName);
        var year = DateTime.UtcNow.Year;

        var reasonBlock = reason != null
            ? $@"<tr><td style='padding:0 24px 18px;'>
                   <div style='background:#fef2f2;border-left:3px solid #ef4444;
                               border-radius:0 8px 8px 0;padding:12px 16px;'>
                     <p style='margin:0;font-size:13px;color:#374151;line-height:1.6;'>
                       <strong style='color:#991b1b;'>Feedback:</strong>
                       {System.Web.HttpUtility.HtmlEncode(reason)}
                     </p>
                   </div>
                 </td></tr>"
            : "";

        return $@"<!doctype html>
<html lang='en'>
<head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/>
<title>Application Update</title></head>
<body style='margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;'>
  <table role='presentation' cellpadding='0' cellspacing='0' width='100%'
         style='background:#f4f6fb;padding:24px 0;'>
    <tr><td align='center'>
      <table role='presentation' cellpadding='0' cellspacing='0' width='600'
             style='width:600px;max-width:92%;background:#fff;border-radius:16px;
                    overflow:hidden;box-shadow:0 10px 30px rgba(16,24,40,.12);'>

        <tr>
          <td style='background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:22px 24px;'>
            <div style='font-size:18px;color:#fff;font-weight:700;'>Jobify</div>
            <div style='font-size:13px;color:rgba(255,255,255,.9);margin-top:4px;'>
              Application Status Update
            </div>
          </td>
        </tr>

        <tr><td style='padding:28px 24px 8px;'>
          <p style='margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;'>
            Dear {encodedName},
          </p>
          <p style='margin:0 0 16px;font-size:14px;line-height:1.7;color:#374151;'>
            Thank you for your interest in the
            <strong>{encodedTitle}</strong> position at
            <strong>{encodedCompany}</strong>.
          </p>
          <p style='margin:0 0 20px;font-size:14px;line-height:1.7;color:#374151;'>
            After careful consideration, we regret to inform you that we will not be
            moving forward with your application at this time. We appreciate the time
            and effort you invested and encourage you to apply for future opportunities
            that match your profile.
          </p>
        </td></tr>

        {reasonBlock}

        <tr><td style='padding:0 24px 24px;'>
          <p style='margin:0;font-size:14px;line-height:1.7;color:#374151;'>
            We wish you the very best in your job search.
          </p>
          <p style='margin:16px 0 0;font-size:14px;color:#374151;'>
            Kind regards,<br/>
            <strong>The {encodedCompany} Team</strong>
          </p>
        </td></tr>

        <tr><td style='padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;'>
          <div style='font-size:12px;color:#9ca3af;'>
            © {year} Jobify. All rights reserved.
          </div>
          <div style='font-size:12px;color:#9ca3af;margin-top:4px;'>
            This is an automated message — please do not reply.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>";
    }


}
