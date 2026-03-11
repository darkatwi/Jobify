using Jobify.Api.Data;
using Jobify.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;

namespace Jobify.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<IdentityUser> _userManager;
    private readonly IConfiguration _config;

    public ProfileController(
        AppDbContext context,
        UserManager<IdentityUser> userManager,
        IConfiguration config)
    {
        _context = context;
        _userManager = userManager;
        _config = config;
    }

    private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    private async Task<(IdentityUser user, IList<string> roles)?> GetUserAndRolesAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return null;

        var roles = await _userManager.GetRolesAsync(user);
        return (user, roles);
    }

    private string GetStudentUploadsRoot()
        => _config["FileStorage:StudentUploadsRoot"] ?? "Uploads/Students";

    private string BuildStudentUserFolder(string userId)
        => Path.Combine(GetStudentUploadsRoot(), userId);

    private static string SafeExt(string fileName)
    {
        var ext = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(ext)) return "";
        return ext.Length > 12 ? "" : ext;
    }

    private static bool IsAllowedResumeType(string contentType, string ext)
    {
        return contentType == "application/pdf"
            || contentType == "application/msword"
            || contentType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            || ext.Equals(".pdf", StringComparison.OrdinalIgnoreCase)
            || ext.Equals(".doc", StringComparison.OrdinalIgnoreCase)
            || ext.Equals(".docx", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAllowedProofType(string contentType, string ext)
    {
        return contentType.StartsWith("image/")
            || contentType == "application/pdf"
            || ext.Equals(".pdf", StringComparison.OrdinalIgnoreCase)
            || ext.Equals(".png", StringComparison.OrdinalIgnoreCase)
            || ext.Equals(".jpg", StringComparison.OrdinalIgnoreCase)
            || ext.Equals(".jpeg", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<StudentProfile> GetOrCreateStudentProfile(string userId)
    {
        var studentProfile = await _context.StudentProfiles.FirstOrDefaultAsync(s => s.UserId == userId);

        if (studentProfile == null)
        {
            studentProfile = new StudentProfile
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _context.StudentProfiles.Add(studentProfile);
            await _context.SaveChangesAsync();
        }

        return studentProfile;
    }

    private async Task<string> SaveFileAsync(IFormFile file, string folder, string prefix)
    {
        Directory.CreateDirectory(folder);

        var ext = SafeExt(file.FileName);
        var storedName = $"{prefix}_{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(folder, storedName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return storedName;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User not authenticated");

        var ur = await GetUserAndRolesAsync(userId);
        if (ur == null)
            return NotFound("User not found");

        var roles = ur.Value.roles;

        if (roles.Contains("Student"))
        {
            var studentProfile = await _context.StudentProfiles
                .FirstOrDefaultAsync(sp => sp.UserId == userId);

            if (studentProfile == null)
            {
                studentProfile = new StudentProfile
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.StudentProfiles.Add(studentProfile);
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                role = "Student",
                email = ur.Value.user.Email,
                profile = new
                {
                    userId = studentProfile.UserId,
                    fullName = studentProfile.FullName,
                    university = studentProfile.University,
                    major = studentProfile.Major,
                    bio = studentProfile.Bio,
                    portfolioUrl = studentProfile.PortfolioUrl,
                    location = studentProfile.Location,
                    phoneNumber = studentProfile.PhoneNumber,
                    educationText = studentProfile.EducationText,
                    experienceText = studentProfile.ExperienceText,
                    projectsText = studentProfile.ProjectsText,
                    interestsText = studentProfile.InterestsText,
                    certificationsText = studentProfile.CertificationsText,
                    awardsText = studentProfile.AwardsText,
                    createdAt = studentProfile.CreatedAt,
                    updatedAt = studentProfile.UpdatedAt,
                    hasResume = !string.IsNullOrEmpty(studentProfile.ResumeFileName),
                    hasUniversityProof = !string.IsNullOrEmpty(studentProfile.UniversityProofFileName),
                    resumeUploadedAtUtc = studentProfile.ResumeUploadedAtUtc,
                    universityProofUploadedAtUtc = studentProfile.UniversityProofUploadedAtUtc
                }
            });
        }
        else if (roles.Contains("Recruiter"))
        {
            var recruiterProfile = await _context.RecruiterProfiles
                .FirstOrDefaultAsync(rp => rp.UserId == userId);

            if (recruiterProfile == null)
            {
                recruiterProfile = new RecruiterProfile
                {
                    UserId = userId,
                    CompanyName = "",
                    CreatedAtUtc = DateTime.UtcNow
                };
                _context.RecruiterProfiles.Add(recruiterProfile);
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                role = "Recruiter",
                profile = new
                {
                    userId = recruiterProfile.UserId,
                    companyName = recruiterProfile.CompanyName,
                    emailDomain = recruiterProfile.EmailDomain,
                    websiteUrl = recruiterProfile.WebsiteUrl,
                    linkedinUrl = recruiterProfile.LinkedinUrl,
                    instagramUrl = recruiterProfile.InstagramUrl,
                    verificationStatus = recruiterProfile.VerificationStatus.ToString(),
                    notes = recruiterProfile.Notes,
                    createdAt = recruiterProfile.CreatedAtUtc,
                    emailConfirmedAt = recruiterProfile.EmailConfirmedAtUtc,
                    verifiedAt = recruiterProfile.VerifiedAtUtc
                }
            });
        }

        return BadRequest("User has no valid role");
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User not authenticated");

        var ur = await GetUserAndRolesAsync(userId);
        if (ur == null)
            return NotFound("User not found");

        var roles = ur.Value.roles;

        if (roles.Contains("Student"))
        {
            var studentProfile = await _context.StudentProfiles
                .FirstOrDefaultAsync(sp => sp.UserId == userId);

            if (studentProfile == null)
            {
                studentProfile = new StudentProfile
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.StudentProfiles.Add(studentProfile);
            }

            studentProfile.FullName = request.FullName;
            studentProfile.University = request.University;
            studentProfile.Major = request.Major;
            studentProfile.Bio = request.Bio;
            studentProfile.PortfolioUrl = request.PortfolioUrl;
            studentProfile.Location = request.Location;
            studentProfile.PhoneNumber = request.PhoneNumber;
            studentProfile.EducationText = request.EducationText;
            studentProfile.ExperienceText = request.ExperienceText;
            studentProfile.ProjectsText = request.ProjectsText;
            studentProfile.InterestsText = request.InterestsText;
            studentProfile.CertificationsText = request.CertificationsText;
            studentProfile.AwardsText = request.AwardsText;
            studentProfile.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                role = "Student",
                profile = new
                {
                    userId = studentProfile.UserId,
                    fullName = studentProfile.FullName,
                    university = studentProfile.University,
                    major = studentProfile.Major,
                    bio = studentProfile.Bio,
                    portfolioUrl = studentProfile.PortfolioUrl,
                    location = studentProfile.Location,
                    phoneNumber = studentProfile.PhoneNumber,
                    educationText = studentProfile.EducationText,
                    experienceText = studentProfile.ExperienceText,
                    projectsText = studentProfile.ProjectsText,
                    interestsText = studentProfile.InterestsText,
                    certificationsText = studentProfile.CertificationsText,
                    awardsText = studentProfile.AwardsText,
                    updatedAt = studentProfile.UpdatedAt,
                    hasResume = !string.IsNullOrEmpty(studentProfile.ResumeFileName),
                    hasUniversityProof = !string.IsNullOrEmpty(studentProfile.UniversityProofFileName),
                    resumeUploadedAtUtc = studentProfile.ResumeUploadedAtUtc,
                    universityProofUploadedAtUtc = studentProfile.UniversityProofUploadedAtUtc
                }
            });
        }
        else if (roles.Contains("Recruiter"))
        {
            var recruiterProfile = await _context.RecruiterProfiles
                .FirstOrDefaultAsync(rp => rp.UserId == userId);

            if (recruiterProfile == null)
            {
                recruiterProfile = new RecruiterProfile
                {
                    UserId = userId,
                    CreatedAtUtc = DateTime.UtcNow
                };
                _context.RecruiterProfiles.Add(recruiterProfile);
            }

            if (!string.IsNullOrEmpty(request.CompanyName))
                recruiterProfile.CompanyName = request.CompanyName;

            recruiterProfile.EmailDomain = request.EmailDomain;
            recruiterProfile.WebsiteUrl = request.WebsiteUrl;
            recruiterProfile.LinkedinUrl = request.LinkedinUrl;
            recruiterProfile.InstagramUrl = request.InstagramUrl;
            recruiterProfile.Notes = request.Notes;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                role = "Recruiter",
                profile = new
                {
                    userId = recruiterProfile.UserId,
                    companyName = recruiterProfile.CompanyName,
                    emailDomain = recruiterProfile.EmailDomain,
                    websiteUrl = recruiterProfile.WebsiteUrl,
                    linkedinUrl = recruiterProfile.LinkedinUrl,
                    instagramUrl = recruiterProfile.InstagramUrl,
                    verificationStatus = recruiterProfile.VerificationStatus.ToString(),
                    notes = recruiterProfile.Notes
                }
            });
        }

        return BadRequest("User has no valid role");
    }

    [HttpPost("student/resume")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadStudentResume(IFormFile file)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User not authenticated");

        var ur = await GetUserAndRolesAsync(userId);
        if (ur == null)
            return NotFound("User not found");

        var roles = ur.Value.roles;
        if (!roles.Contains("Student"))
            return Forbid("Only students can upload resume.");

        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest("File too large. Max 10MB.");

        var ext = SafeExt(file.FileName);
        if (!IsAllowedResumeType(file.ContentType ?? "", ext))
            return BadRequest("Resume must be PDF/DOC/DOCX.");

        var studentProfile = await GetOrCreateStudentProfile(userId);

        var folder = BuildStudentUserFolder(userId);
        var storedName = await SaveFileAsync(file, folder, "resume");
        if (!string.IsNullOrEmpty(studentProfile.ResumeFileName))
        {
            var oldPath = Path.Combine(folder, studentProfile.ResumeFileName);
            if (System.IO.File.Exists(oldPath))
                System.IO.File.Delete(oldPath);
        }

        studentProfile.ResumeFileName = storedName;
        studentProfile.ResumeOriginalFileName = file.FileName;
        studentProfile.ResumeContentType = file.ContentType;
        studentProfile.ResumeUploadedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            role = "Student",
            profile = new
            {
                hasResume = true,
                resumeUploadedAtUtc = studentProfile.ResumeUploadedAtUtc
            }
        });
    }

    [HttpGet("student/resume")]
    public async Task<IActionResult> DownloadStudentResume()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User not authenticated");

        var ur = await GetUserAndRolesAsync(userId);
        if (ur == null)
            return NotFound("User not found");

        var roles = ur.Value.roles;
        if (!roles.Contains("Student"))
            return Forbid("Only students can download resume.");

        var studentProfile = await _context.StudentProfiles.FirstOrDefaultAsync(s => s.UserId == userId);
        if (studentProfile == null || string.IsNullOrEmpty(studentProfile.ResumeFileName))
            return NotFound("No resume uploaded.");

        var folder = BuildStudentUserFolder(userId);
        var fullPath = Path.Combine(folder, studentProfile.ResumeFileName);

        if (!System.IO.File.Exists(fullPath))
            return NotFound("Resume file missing on server.");

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var contentType = studentProfile.ResumeContentType ?? "application/octet-stream";
        var downloadName = studentProfile.ResumeOriginalFileName ?? "resume";

        return File(stream, contentType, downloadName);
    }

    [HttpDelete("student/resume")]
    public async Task<IActionResult> DeleteStudentResume()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User not authenticated");

        var ur = await GetUserAndRolesAsync(userId);
        if (ur == null)
            return NotFound("User not found");

        var roles = ur.Value.roles;
        if (!roles.Contains("Student"))
            return Forbid("Only students can delete resume.");

        var studentProfile = await _context.StudentProfiles.FirstOrDefaultAsync(s => s.UserId == userId);
        if (studentProfile == null || string.IsNullOrEmpty(studentProfile.ResumeFileName))
            return NotFound("No resume uploaded.");

        var folder = BuildStudentUserFolder(userId);
        var fullPath = Path.Combine(folder, studentProfile.ResumeFileName);

        if (System.IO.File.Exists(fullPath))
            System.IO.File.Delete(fullPath);

        studentProfile.ResumeFileName = null;
        studentProfile.ResumeOriginalFileName = null;
        studentProfile.ResumeContentType = null;
        studentProfile.ResumeUploadedAtUtc = null;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Resume deleted successfully" });
    }

    [HttpPost("student/university-proof")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadUniversityProof(IFormFile file)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User not authenticated");

        var ur = await GetUserAndRolesAsync(userId);
        if (ur == null)
            return NotFound("User not found");

        var roles = ur.Value.roles;
        if (!roles.Contains("Student"))
            return Forbid("Only students can upload university proof.");

        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest("File too large. Max 10MB.");

        var originalName = file.FileName ?? "university_proof";
        var ext = SafeExt(originalName);
        var contentType = file.ContentType ?? "";

        if (!IsAllowedProofType(contentType, ext))
            return BadRequest("University proof must be an image (png/jpg) or PDF.");

        var studentProfile = await GetOrCreateStudentProfile(userId);

        var folder = BuildStudentUserFolder(userId);
        var storedName = await SaveFileAsync(file, folder, "university_proof");
        var fullPath = Path.Combine(folder, storedName);

        try
        {
            var text = _ocrService.ExtractText(fullPath);
            var normalizedText = NormalizeText(text);
            var extractedUniversityName = ExtractUniversityName(text);

            var institutionKeywords = new[]
            {
            "university",
            "college",
            "institute",
            "school",
            "faculty",
            "campus",
            "aub",
            "american university of beirut",
            "beirut"
        };

            var idKeywords = new[]
            {
            "student",
            "student id",
            "id",
            "ug",
            "undergraduate",
            "graduate",
            "spring",
            "fall",
            "summer",
            "arts",
            "sciences"
        };

            var enrollmentKeywords = new[]
            {
            "registration",
            "enrollment",
            "currently registered",
            "registrar",
            "office of the registrar",
            "admissions",
            "semester",
            "term",
            "major",
            "department",
            "academic",
            "faculty"
        };

            var transcriptKeywords = new[]
            {
            "transcript",
            "courses",
            "credit hours",
            "gpa",
            "semester",
            "term",
            "academic record",
            "grade"
        };

            int institutionScore = institutionKeywords.Count(k => normalizedText.Contains(k));
            int idScore = idKeywords.Count(k => normalizedText.Contains(k));
            int enrollmentScore = enrollmentKeywords.Count(k => normalizedText.Contains(k));
            int transcriptScore = transcriptKeywords.Count(k => normalizedText.Contains(k));

            bool nameMatched = false;
            if (!string.IsNullOrWhiteSpace(studentProfile.FullName))
            {
                nameMatched = NameLooksPresent(text, studentProfile.FullName);
            }

            if (!nameMatched)
            {
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);

                return BadRequest("The name on the university proof does not match the name in your profile.");
            }

            bool looksLikeUniversityName = !string.IsNullOrWhiteSpace(extractedUniversityName);

            bool hasStudentNumber = Regex.IsMatch(normalizedText, @"\b\d{7,10}\b");

            bool directUniversityMatch =
                normalizedText.Contains("american university of beirut") ||
                normalizedText.Contains("aub");

            bool isStudentId =
                (institutionScore >= 1 || directUniversityMatch || looksLikeUniversityName) &&
                (
                    idScore >= 2 ||
                    (normalizedText.Contains("student") && hasStudentNumber) ||
                    (normalizedText.Contains("student") && looksLikeUniversityName) ||
                    (normalizedText.Contains("student") && directUniversityMatch)
                );

            bool isEnrollmentProof =
                (institutionScore >= 1 || directUniversityMatch || looksLikeUniversityName) &&
                enrollmentScore >= 2;

            bool isTranscript =
                (institutionScore >= 1 || directUniversityMatch || looksLikeUniversityName) &&
                transcriptScore >= 2;

            bool isAcceptedUniversityProof =
                isStudentId || isEnrollmentProof || isTranscript;

            if (!isAcceptedUniversityProof)
            {
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);

                return BadRequest("Uploaded document does not appear to be valid university proof.");
            }

        if (!string.IsNullOrEmpty(studentProfile.UniversityProofFileName))
        {
            var oldPath = Path.Combine(folder, studentProfile.UniversityProofFileName);
            if (System.IO.File.Exists(oldPath))
                System.IO.File.Delete(oldPath);
        }

        studentProfile.UniversityProofFileName = storedName;
        studentProfile.UniversityProofOriginalFileName = originalName;
        studentProfile.UniversityProofContentType = contentType;
        studentProfile.UniversityProofUploadedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

            return Ok(new
            {
                role = "Student",
                profile = new
                {
                    hasUniversityProof = true,
                    universityProofUploadedAtUtc = studentProfile.UniversityProofUploadedAtUtc
                },
                debug = new
                {
                    extractedText = text,
                    normalizedText = normalizedText,
                    extractedUniversityName = extractedUniversityName,
                    institutionScore = institutionScore,
                    idScore = idScore,
                    enrollmentScore = enrollmentScore,
                    transcriptScore = transcriptScore,
                    hasStudentNumber = hasStudentNumber,
                    looksLikeUniversityName = looksLikeUniversityName,
                    directUniversityMatch = directUniversityMatch,
                    nameMatched = nameMatched,
                    isStudentId = isStudentId,
                    isEnrollmentProof = isEnrollmentProof,
                    isTranscript = isTranscript
                }
            });
        }
        catch (Exception ex)
        {
            if (System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);

            return BadRequest($"OCR failed: {ex.Message}");
        }
    }

    [HttpGet("student/university-proof")]
    public async Task<IActionResult> DownloadUniversityProof()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User not authenticated");

        var ur = await GetUserAndRolesAsync(userId);
        if (ur == null)
            return NotFound("User not found");

        var roles = ur.Value.roles;
        if (!roles.Contains("Student"))
            return Forbid("Only students can download university proof.");

        var studentProfile = await _context.StudentProfiles.FirstOrDefaultAsync(s => s.UserId == userId);
        if (studentProfile == null || string.IsNullOrEmpty(studentProfile.UniversityProofFileName))
            return NotFound("No university proof uploaded.");

        var folder = BuildStudentUserFolder(userId);
        var fullPath = Path.Combine(folder, studentProfile.UniversityProofFileName);

        if (!System.IO.File.Exists(fullPath))
            return NotFound("University proof file missing on server.");

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var contentType = studentProfile.UniversityProofContentType ?? "application/octet-stream";
        var downloadName = studentProfile.UniversityProofOriginalFileName ?? "university_proof";

        return File(stream, contentType, downloadName);
    }

    [HttpDelete("student/university-proof")]
    public async Task<IActionResult> DeleteUniversityProof()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User not authenticated");

        var ur = await GetUserAndRolesAsync(userId);
        if (ur == null)
            return NotFound("User not found");

        var roles = ur.Value.roles;
        if (!roles.Contains("Student"))
            return Forbid("Only students can delete university proof.");

        var studentProfile = await _context.StudentProfiles.FirstOrDefaultAsync(s => s.UserId == userId);
        if (studentProfile == null || string.IsNullOrEmpty(studentProfile.UniversityProofFileName))
            return NotFound("No university proof uploaded.");

        var folder = BuildStudentUserFolder(userId);
        var fullPath = Path.Combine(folder, studentProfile.UniversityProofFileName);

        if (System.IO.File.Exists(fullPath))
            System.IO.File.Delete(fullPath);

        studentProfile.UniversityProofFileName = null;
        studentProfile.UniversityProofOriginalFileName = null;
        studentProfile.UniversityProofContentType = null;
        studentProfile.UniversityProofUploadedAtUtc = null;

        await _context.SaveChangesAsync();

        return Ok(new { message = "University proof deleted successfully" });
    }

    [HttpGet("student/skills")]
    public async Task<IActionResult> GetSkills()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var skills = await _context.StudentSkills
            .Where(s => s.StudentUserId == userId)
            .Join(_context.Skills, ss => ss.SkillId, sk => sk.Id, (ss, sk) => new
            {
                id = ss.Id,
                name = sk.Name,
                isVerified = ss.IsVerified,
                source = ss.Source,
                createdAt = ss.CreatedAt
            })
            .ToListAsync();

        return Ok(skills);
    }

    [HttpPost("student/skills")]
    public async Task<IActionResult> AddSkill([FromBody] AddSkillRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("Skill name required.");

        var skill = await _context.Skills.FirstOrDefaultAsync(s => s.Name.ToLower() == request.Name.ToLower().Trim());
        if (skill == null)
        {
            skill = new Skill { Name = request.Name.Trim() };
            _context.Skills.Add(skill);
            await _context.SaveChangesAsync();
        }

        var existing = await _context.StudentSkills.FirstOrDefaultAsync(ss => ss.StudentUserId == userId && ss.SkillId == skill.Id);
        if (existing != null) return Conflict("Skill already added.");

        var studentSkill = new StudentSkill
        {
            StudentUserId = userId,
            SkillId = skill.Id,
            Source = "Manual",
            IsVerified = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.StudentSkills.Add(studentSkill);
        await _context.SaveChangesAsync();

        return Ok(new { id = studentSkill.Id, name = skill.Name, isVerified = false, source = "Manual" });
    }

    [HttpDelete("student/skills/{id}")]
    public async Task<IActionResult> DeleteSkill(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var skill = await _context.StudentSkills.FirstOrDefaultAsync(s => s.Id == id && s.StudentUserId == userId);
        if (skill == null) return NotFound();

        _context.StudentSkills.Remove(skill);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Skill removed." });
    }

    [HttpGet("student/education")]
    public async Task<IActionResult> GetEducation()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var items = await _context.StudentEducations
            .Where(e => e.StudentUserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new { e.Id, e.University, e.Degree, e.Major, e.Gpa, e.GraduationYear, e.CreatedAt })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("student/education")]
    public async Task<IActionResult> AddEducation([FromBody] EducationRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = new StudentEducation
        {
            StudentUserId = userId,
            University = request.University,
            Degree = request.Degree,
            Major = request.Major,
            Gpa = request.Gpa,
            GraduationYear = request.GraduationYear,
            CreatedAt = DateTime.UtcNow
        };

        _context.StudentEducations.Add(item);
        await _context.SaveChangesAsync();
        return Ok(new { item.Id, item.University, item.Degree, item.Major, item.Gpa, item.GraduationYear, item.CreatedAt });
    }

    [HttpPut("student/education/{id}")]
    public async Task<IActionResult> UpdateEducation(int id, [FromBody] EducationRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = await _context.StudentEducations.FirstOrDefaultAsync(e => e.Id == id && e.StudentUserId == userId);
        if (item == null) return NotFound();

        item.University = request.University;
        item.Degree = request.Degree;
        item.Major = request.Major;
        item.Gpa = request.Gpa;
        item.GraduationYear = request.GraduationYear;

        await _context.SaveChangesAsync();
        return Ok(new { item.Id, item.University, item.Degree, item.Major, item.Gpa, item.GraduationYear });
    }

    [HttpDelete("student/education/{id}")]
    public async Task<IActionResult> DeleteEducation(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = await _context.StudentEducations.FirstOrDefaultAsync(e => e.Id == id && e.StudentUserId == userId);
        if (item == null) return NotFound();

        _context.StudentEducations.Remove(item);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Education removed." });
    }

    [HttpGet("student/experience")]
    public async Task<IActionResult> GetExperience()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var items = await _context.StudentExperiences
            .Where(e => e.StudentUserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new { e.Id, e.Role, e.Company, e.Duration, e.Description, e.CreatedAt })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("student/experience")]
    public async Task<IActionResult> AddExperience([FromBody] ExperienceRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = new StudentExperience
        {
            StudentUserId = userId,
            Role = request.Role,
            Company = request.Company,
            Duration = request.Duration,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow
        };

        _context.StudentExperiences.Add(item);
        await _context.SaveChangesAsync();
        return Ok(new { item.Id, item.Role, item.Company, item.Duration, item.Description, item.CreatedAt });
    }

    [HttpPut("student/experience/{id}")]
    public async Task<IActionResult> UpdateExperience(int id, [FromBody] ExperienceRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = await _context.StudentExperiences.FirstOrDefaultAsync(e => e.Id == id && e.StudentUserId == userId);
        if (item == null) return NotFound();

        item.Role = request.Role;
        item.Company = request.Company;
        item.Duration = request.Duration;
        item.Description = request.Description;

        await _context.SaveChangesAsync();
        return Ok(new { item.Id, item.Role, item.Company, item.Duration, item.Description });
    }

    [HttpDelete("student/experience/{id}")]
    public async Task<IActionResult> DeleteExperience(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = await _context.StudentExperiences.FirstOrDefaultAsync(e => e.Id == id && e.StudentUserId == userId);
        if (item == null) return NotFound();

        _context.StudentExperiences.Remove(item);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Experience removed." });
    }

    [HttpGet("student/projects")]
    public async Task<IActionResult> GetProjects()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var items = await _context.StudentProjects
            .Where(p => p.StudentUserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new { p.Id, p.Title, p.Description, p.TechStack, p.Links, p.CreatedAt })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("student/projects")]
    public async Task<IActionResult> AddProject([FromBody] ProjectRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = new StudentProject
        {
            StudentUserId = userId,
            Title = request.Title,
            Description = request.Description,
            TechStack = string.Join(",", request.TechStack ?? new List<string>()),
            Links = request.Links,
            CreatedAt = DateTime.UtcNow
        };

        _context.StudentProjects.Add(item);
        await _context.SaveChangesAsync();
        return Ok(new { item.Id, item.Title, item.Description, item.TechStack, item.Links, item.CreatedAt });
    }

    [HttpPut("student/projects/{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] ProjectRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = await _context.StudentProjects.FirstOrDefaultAsync(p => p.Id == id && p.StudentUserId == userId);
        if (item == null) return NotFound();

        item.Title = request.Title;
        item.Description = request.Description;
        item.TechStack = string.Join(",", request.TechStack ?? new List<string>());
        item.Links = request.Links;

        await _context.SaveChangesAsync();
        return Ok(new { item.Id, item.Title, item.Description, item.TechStack, item.Links });
    }

    [HttpDelete("student/projects/{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = await _context.StudentProjects.FirstOrDefaultAsync(p => p.Id == id && p.StudentUserId == userId);
        if (item == null) return NotFound();

        _context.StudentProjects.Remove(item);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Project removed." });
    }

    [HttpGet("student/interests")]
    public async Task<IActionResult> GetInterests()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var items = await _context.StudentInterests
            .Where(i => i.StudentUserId == userId)
            .OrderBy(i => i.Interest)
            .Select(i => new { i.Id, i.Interest, i.CreatedAt })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("student/interests")]
    public async Task<IActionResult> AddInterest([FromBody] InterestRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Interest)) return BadRequest("Interest name required.");

        var existing = await _context.StudentInterests
            .FirstOrDefaultAsync(i => i.StudentUserId == userId && i.Interest.ToLower() == request.Interest.ToLower().Trim());
        if (existing != null) return Conflict("Interest already added.");

        var item = new StudentInterest
        {
            StudentUserId = userId,
            Interest = request.Interest.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.StudentInterests.Add(item);
        await _context.SaveChangesAsync();
        return Ok(new { item.Id, item.Interest, item.CreatedAt });
    }

    [HttpDelete("student/interests/{id}")]
    public async Task<IActionResult> DeleteInterest(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var item = await _context.StudentInterests.FirstOrDefaultAsync(i => i.Id == id && i.StudentUserId == userId);
        if (item == null) return NotFound();

        _context.StudentInterests.Remove(item);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Interest removed." });
    }
}

public class UpdateProfileRequest
{
    public string? FullName { get; set; }
    public string? University { get; set; }
    public string? Major { get; set; }
    public string? Bio { get; set; }
    public string? PortfolioUrl { get; set; }
    public string? Location { get; set; }
    public string? PhoneNumber { get; set; }
    public string? EducationText { get; set; }
    public string? ExperienceText { get; set; }
    public string? ProjectsText { get; set; }
    public string? InterestsText { get; set; }
    public string? CertificationsText { get; set; }
    public string? AwardsText { get; set; }

    public string? CompanyName { get; set; }
    public string? EmailDomain { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? LinkedinUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? Notes { get; set; }
}

public class UploadResumeRequest
{
    public IFormFile File { get; set; } = default!;
}

public class AddSkillRequest
{
    public string Name { get; set; } = string.Empty;
}

public class EducationRequest
{
    public string University { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public string? Gpa { get; set; }
    public string GraduationYear { get; set; } = string.Empty;
}

public class ExperienceRequest
{
    public string Role { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class ProjectRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string>? TechStack { get; set; }
    public string? Links { get; set; }
}

public class InterestRequest
{
    public string Interest { get; set; } = string.Empty;
}   
public class UploadUniversityProofRequest
{
    public IFormFile File { get; set; } = default!;
}
