using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.Models;
using Jobify.Api.Services;
using Jobify.Api.Services.SkillServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace Jobify.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OpportunitiesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly SkillService _skillService;
    private readonly MlSkillClient _mlSkillClient;

    public OpportunitiesController(AppDbContext db, SkillService skillService, MlSkillClient mlSkillClient)
    {
        _db = db;
        _skillService = skillService;
        _mlSkillClient = mlSkillClient;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<PagedResult<OpportunityCardDto>>> GetAll(
        [FromQuery] string? q,
        [FromQuery] string? type,
        [FromQuery] string? level,
        [FromQuery] bool? remote,
        [FromQuery] string? location,
        [FromQuery] string? skills,
        [FromQuery] decimal? minPay,
        [FromQuery] decimal? maxPay,
        [FromQuery] int applicantCount,
        [FromQuery] string? sort = "newest",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10
    )
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 50) pageSize = 50;

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var applicantSkills = await _db.StudentSkills
                .AsNoTracking()
                .Where(ss => ss.StudentUserId == userId && ss.SkillId != null)
                .Join(
                    _db.Skills,
                    ss => ss.SkillId,
                    s => s.Id,
                    (ss, s) => new SkillInputDto
                    {
                        Name = s.Name,
                        Weight = 1
                    }
                )
                .ToListAsync();

            var applicantSkillNames = applicantSkills
                .Where(a => !string.IsNullOrWhiteSpace(a.Name))
                .Select(a => a.Name.Trim().ToLower())
                .ToHashSet();

            var query = _db.Opportunities
                .AsNoTracking()
                .Include(o => o.OpportunitySkills)
                    .ThenInclude(os => os.Skill)
                .AsQueryable();

            // query = query.Where(o => !o.IsClosed);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var s = q.Trim().ToLower();
                query = query.Where(o =>
                    o.Title.ToLower().Contains(s) ||
                    o.CompanyName.ToLower().Contains(s) ||
                    o.OpportunitySkills.Any(os => os.Skill != null && os.Skill.Name.ToLower().Contains(s))
                );
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                var rawType = type.Trim();

                if (Enum.TryParse<OpportunityType>(rawType, true, out var parsedType))
                {
                    query = query.Where(o => o.Type == parsedType);
                }
                else
                {
                    return BadRequest("Invalid type.");
                }
            }

            if (!string.IsNullOrWhiteSpace(level))
            {
                var raw = level.Trim().ToLower();

                ExperienceLevel? mapped = raw switch
                {
                    "beginner" => ExperienceLevel.Entry,
                    "intermediate" => ExperienceLevel.Junior,
                    "senior" => ExperienceLevel.Senior,
                    _ => Enum.TryParse<ExperienceLevel>(level.Trim(), true, out var parsedLevel)
                        ? parsedLevel
                        : null
                };

                if (mapped == null)
                    return BadRequest("Invalid level.");

                query = query.Where(o => o.Level == mapped.Value);
            }

            if (remote.HasValue)
            {
                query = query.Where(o => o.IsRemote == remote.Value);
            }

            if (!string.IsNullOrWhiteSpace(location))
            {
                var loc = location.Trim().ToLower();
                query = query.Where(o => o.Location != null && o.Location.ToLower().Contains(loc));
            }

            if (!string.IsNullOrWhiteSpace(skills))
            {
                var wanted = skills
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(x => x.ToLower())
                    .ToList();

                if (wanted.Count > 0)
                {
                    query = query.Where(o =>
                        o.OpportunitySkills.Any(os => os.Skill != null && wanted.Contains(os.Skill.Name.ToLower()))
                    );
                }
            }

            if (minPay.HasValue)
                query = query.Where(o => o.MaxPay == null || o.MaxPay >= minPay.Value);

            if (maxPay.HasValue)
                query = query.Where(o => o.MinPay == null || o.MinPay <= maxPay.Value);

            sort = (sort ?? "newest").Trim().ToLower();
            query = sort switch
            {
                "salaryhigh" => query.OrderByDescending(o => o.MaxPay ?? 0),
                "salarylow" => query.OrderBy(o => o.MinPay ?? 0),
                "deadline" => query.OrderBy(o => o.DeadlineUtc ?? DateTime.MaxValue),
                _ => query.OrderByDescending(o => o.CreatedAtUtc)
            };

            var total = await query.CountAsync();

            var rawItems = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = rawItems.Select(o =>
            {
                var safeSkills = o.OpportunitySkills?
                    .Where(os => os.Skill != null && !string.IsNullOrWhiteSpace(os.Skill.Name))
                    .Select(os => os.Skill!.Name.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? new List<string>();

                var matchedSkills = safeSkills
                    .Where(skill => applicantSkillNames.Contains(skill.Trim().ToLower()))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                var matchPercentage = CalculateMatchPercentage(
                    applicantSkills.Select(a => a.Name).Where(n => !string.IsNullOrWhiteSpace(n)).ToList()!,
                    safeSkills
                );

                return new OpportunityCardDto
                {
                    Id = o.Id,
                    Title = o.Title,
                    CompanyName = o.CompanyName,
                    Location = o.Location,
                    IsRemote = o.IsRemote,
                    WorkMode = o.WorkMode.ToString(),
                    Type = o.Type.ToString(),
                    Level = o.Level.ToString(),
                    MinPay = o.MinPay,
                    MaxPay = o.MaxPay,
                    CreatedAtUtc = o.CreatedAtUtc,
                    DeadlineUtc = o.DeadlineUtc,
                    Skills = safeSkills,
                    AssessmentTimeLimitSeconds = o.AssessmentTimeLimitSeconds,
                    AssessmentMcqCount = o.AssessmentMcqCount,
                    AssessmentChallengeCount = o.AssessmentChallengeCount,
                    MatchPercentage = matchPercentage,
                    MatchedSkills = matchedSkills
                };
            }).ToList();

            items = items
                .OrderByDescending(x => x.MatchPercentage)
                .ToList();

            return Ok(new PagedResult<OpportunityCardDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.ToString());
        }
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<OpportunityDetailsDto>> GetById(int id)
    {
        var o = await _db.Opportunities
            .AsNoTracking()
            .Include(x => x.OpportunitySkills)
                .ThenInclude(os => os.Skill)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (o == null) return NotFound();

        var qa = await _db.OpportunityQuestions
            .AsNoTracking()
            .Where(q => q.OpportunityId == id)
            .OrderByDescending(q => q.AskedAtUtc)
            .Select(q => new QaDto
            {
                Id = q.Id,
                Question = q.Question,
                Answer = q.Answer,
                AskedAtUtc = q.AskedAtUtc
            })
            .ToListAsync();

        var opportunitySkills = o.OpportunitySkills
            .Where(os => os.Skill != null && !string.IsNullOrWhiteSpace(os.Skill.Name))
            .Select(os => os.Skill!.Name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var matchPercentage = 0;

        if (!string.IsNullOrEmpty(userId))
        {
            var studentSkillNames = await GetStudentSkillNames(userId);
            matchPercentage = CalculateMatchPercentage(studentSkillNames, opportunitySkills);
        }

        return Ok(new OpportunityDetailsDto
        {
            Id = o.Id,
            Title = o.Title,
            CompanyName = o.CompanyName,
            Location = o.Location,
            IsRemote = o.IsRemote,
            WorkMode = o.WorkMode.ToString(),
            LocationName = o.LocationName,
            FullAddress = o.FullAddress,
            Latitude = o.Latitude,
            Longitude = o.Longitude,
            Type = o.Type.ToString(),
            Level = o.Level.ToString(),
            MinPay = o.MinPay,
            MaxPay = o.MaxPay,
            Description = o.Description,
            CreatedAtUtc = o.CreatedAtUtc,
            DeadlineUtc = o.DeadlineUtc,
            Responsibilities = ReadList(o.ResponsibilitiesJson),
            PreferredSkills = ReadList(o.PreferredSkillsJson),
            Benefits = ReadList(o.BenefitsJson),
            Assessment = string.IsNullOrWhiteSpace(o.AssessmentJson)
                ? null
                : JsonSerializer.Deserialize<object>(o.AssessmentJson),
            AssessmentTimeLimitSeconds = o.AssessmentTimeLimitSeconds,
            AssessmentMcqCount = o.AssessmentMcqCount,
            AssessmentChallengeCount = o.AssessmentChallengeCount,
            MatchPercentage = matchPercentage,
            Skills = opportunitySkills,
            Qa = qa
        });
    }

    [HttpGet("{id}/similar")]
    public async Task<ActionResult<List<OpportunityCardDto>>> GetSimilar(
        int id,
        [FromQuery] int take = 4)
    {
        var baseOpp = await _db.Opportunities
            .Include(o => o.OpportunitySkills)
                .ThenInclude(os => os.Skill)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (baseOpp == null)
            return NotFound();

        var baseSkills = baseOpp.OpportunitySkills
            .Where(os => os.Skill != null && !string.IsNullOrWhiteSpace(os.Skill.Name))
            .Select(os => os.Skill!.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var candidates = await _db.Opportunities
            .Include(o => o.OpportunitySkills)
                .ThenInclude(os => os.Skill)
            .Where(o => o.Id != id && o.Type == baseOpp.Type && !o.IsClosed)
            .Take(150)
            .ToListAsync();

        double Score(Opportunity o)
        {
            var skills = o.OpportunitySkills
                .Where(os => os.Skill != null && !string.IsNullOrWhiteSpace(os.Skill.Name))
                .Select(os => os.Skill!.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var intersection = skills.Intersect(baseSkills).Count();
            var union = skills.Union(baseSkills).Count();

            var jaccard = union == 0 ? 0.0 : (double)intersection / union;

            var score = jaccard;

            if (o.Level == baseOpp.Level)
                score += 0.15;

            if (o.WorkMode == baseOpp.WorkMode)
                score += 0.10;

            if (!string.IsNullOrWhiteSpace(o.Location) &&
                o.Location == baseOpp.Location)
                score += 0.10;

            return score;
        }

        var result = candidates
            .Select(o => new { Opportunity = o, Score = Score(o) })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(Math.Clamp(take, 1, 12))
            .Select(x => new OpportunityCardDto
            {
                Id = x.Opportunity.Id,
                Title = x.Opportunity.Title,
                CompanyName = x.Opportunity.CompanyName,
                Location = x.Opportunity.Location,
                IsRemote = x.Opportunity.IsRemote,
                Type = x.Opportunity.Type.ToString(),
                Level = x.Opportunity.Level.ToString(),
                MinPay = x.Opportunity.MinPay,
                MaxPay = x.Opportunity.MaxPay,
                CreatedAtUtc = x.Opportunity.CreatedAtUtc,
                DeadlineUtc = x.Opportunity.DeadlineUtc,
                Skills = x.Opportunity.OpportunitySkills
                    .Where(s => s.Skill != null && !string.IsNullOrWhiteSpace(s.Skill.Name))
                    .Select(s => s.Skill!.Name)
                    .ToList(),
                WorkMode = x.Opportunity.WorkMode.ToString(),
                MatchPercentage = 0,
                MatchedSkills = new List<string>(),
                AssessmentTimeLimitSeconds = x.Opportunity.AssessmentTimeLimitSeconds,
                AssessmentMcqCount = x.Opportunity.AssessmentMcqCount,
                AssessmentChallengeCount = x.Opportunity.AssessmentChallengeCount
            })
            .ToList();

        return result;
    }

    [Authorize(Roles = "Student")]
    [HttpPost("{id:int}/save")]
    public async Task<IActionResult> SaveOpportunity(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var opportunityExists = await _db.Opportunities.AnyAsync(o => o.Id == id);
        if (!opportunityExists)
            return NotFound("Opportunity not found.");

        var alreadySaved = await _db.SavedOpportunities
            .AnyAsync(x => x.UserId == userId && x.OpportunityId == id);

        if (alreadySaved)
            return BadRequest("Opportunity already saved.");

        var savedOpportunity = new SavedOpportunity
        {
            UserId = userId,
            OpportunityId = id,
            SavedAtUtc = DateTime.UtcNow
        };

        _db.SavedOpportunities.Add(savedOpportunity);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Opportunity saved successfully." });
    }

    [Authorize(Roles = "Student")]
    [HttpDelete("{id:int}/save")]
    public async Task<IActionResult> UnsaveOpportunity(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var savedOpportunity = await _db.SavedOpportunities
            .FirstOrDefaultAsync(x => x.UserId == userId && x.OpportunityId == id);

        if (savedOpportunity == null)
            return NotFound("Saved opportunity not found.");

        _db.SavedOpportunities.Remove(savedOpportunity);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Opportunity removed from saved list." });
    }

    [Authorize(Roles = "Student")]
    [HttpGet("saved")]
    public async Task<IActionResult> GetSavedOpportunities()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var saved = await _db.SavedOpportunities
            .Where(x => x.UserId == userId)
            .Include(x => x.Opportunity)
            .OrderByDescending(x => x.SavedAtUtc)
            .Select(x => new
            {
                id = x.Opportunity.Id,
                title = x.Opportunity.Title,
                companyName = x.Opportunity.CompanyName,
                location = x.Opportunity.Location,
                isRemote = x.Opportunity.IsRemote,
                workMode = x.Opportunity.WorkMode.ToString(),
                type = x.Opportunity.Type.ToString(),
                level = x.Opportunity.Level.ToString(),
                minPay = x.Opportunity.MinPay,
                maxPay = x.Opportunity.MaxPay,
                createdAtUtc = x.Opportunity.CreatedAtUtc,
                deadlineUtc = x.Opportunity.DeadlineUtc,
                savedAtUtc = x.SavedAtUtc
            })
            .ToListAsync();

        return Ok(saved);
    }

    [Authorize(Roles = "Student")]
    [HttpGet("saved/ids")]
    public async Task<IActionResult> GetSavedOpportunityIds()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var ids = await _db.SavedOpportunities
            .Where(x => x.UserId == userId)
            .Select(x => x.OpportunityId)
            .ToListAsync();

        return Ok(ids);
    }

    [Authorize]
    [HttpPost("{id:int}/questions")]
    public async Task<ActionResult> AskQuestion(int id, [FromBody] QaDto dto)
    {
        var exists = await _db.Opportunities.AnyAsync(o => o.Id == id);
        if (!exists) return NotFound();

        if (dto == null || string.IsNullOrWhiteSpace(dto.Question))
            return BadRequest("Question is required.");

        var q = new OpportunityQuestion
        {
            OpportunityId = id,
            Question = dto.Question.Trim(),
            AskedAtUtc = DateTime.UtcNow
        };

        _db.OpportunityQuestions.Add(q);
        await _db.SaveChangesAsync();

        return Ok(new { q.Id });
    }

    [Authorize(Roles = "Recruiter")]
    [HttpPut("questions/{questionId:int}/answer")]
    public async Task<ActionResult> AnswerQuestion(int questionId, [FromBody] QaDto dto)
    {
        var q = await _db.OpportunityQuestions.FirstOrDefaultAsync(x => x.Id == questionId);
        if (q == null) return NotFound();

        q.Answer = string.IsNullOrWhiteSpace(dto?.Answer)
            ? null
            : dto.Answer.Trim();

        await _db.SaveChangesAsync();

        return NoContent();
    }

    [Authorize(Roles = "Recruiter")]
    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateOpportunityDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.CompanyName))
            return BadRequest("Title and CompanyName are required.");

        if (!Enum.TryParse<OpportunityType>(dto.Type, true, out var parsedType))
            return BadRequest("Invalid Type.");

        if (!Enum.TryParse<ExperienceLevel>(dto.Level, true, out var parsedLevel))
            return BadRequest("Invalid Level.");

        if (!Enum.TryParse<WorkMode>(dto.WorkMode, true, out var parsedMode))
            return BadRequest("Invalid WorkMode. Use OnSite, Remote, or Hybrid.");

        var opportunity = new Opportunity
        {
            Title = dto.Title.Trim(),
            CompanyName = dto.CompanyName.Trim(),
            RecruiterUserId = userId,
            Location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim(),
            IsRemote = parsedMode == WorkMode.Remote,
            WorkMode = parsedMode,
            LocationName = string.IsNullOrWhiteSpace(dto.LocationName) ? null : dto.LocationName.Trim(),
            FullAddress = string.IsNullOrWhiteSpace(dto.FullAddress) ? null : dto.FullAddress.Trim(),
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            ResponsibilitiesJson = WriteList(dto.Responsibilities),
            PreferredSkillsJson = WriteList(dto.PreferredSkills),
            BenefitsJson = WriteList(dto.Benefits),
            AssessmentJson = dto.Assessment == null ? null : JsonSerializer.Serialize(dto.Assessment),
            Type = parsedType,
            Level = parsedLevel,
            MinPay = dto.MinPay,
            MaxPay = dto.MaxPay,
            Description = dto.Description,
            DeadlineUtc = dto.DeadlineUtc,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Opportunities.Add(opportunity);
        await _db.SaveChangesAsync();

        if (dto.Skills != null && dto.Skills.Count > 0)
        {
            foreach (var skillName in dto.Skills)
            {
                if (string.IsNullOrWhiteSpace(skillName))
                    continue;

                var trimmed = skillName.Trim();
                var normalized = trimmed.ToLower();

                var skill = await _db.Skills
                    .FirstOrDefaultAsync(s => s.Name.ToLower() == normalized);

                if (skill == null)
                {
                    skill = new Skill
                    {
                        Name = trimmed
                    };

                    _db.Skills.Add(skill);
                    await _db.SaveChangesAsync();
                }

                _db.OpportunitySkills.Add(new OpportunitySkill
                {
                    OpportunityId = opportunity.Id,
                    SkillId = skill.Id
                });
            }

            await _db.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetById), new { id = opportunity.Id }, new { opportunity.Id });
    }

    [Authorize(Roles = "Recruiter")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult> Update(int id, [FromBody] UpdateOpportunityDto dto)
    {
        var opportunity = await _db.Opportunities.FirstOrDefaultAsync(o => o.Id == id);
        if (opportunity == null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.CompanyName))
            return BadRequest("Title and CompanyName are required.");

        if (!Enum.TryParse<OpportunityType>(dto.Type, true, out var parsedType))
            return BadRequest("Invalid Type.");

        if (!Enum.TryParse<ExperienceLevel>(dto.Level, true, out var parsedLevel))
            return BadRequest("Invalid Level.");

        if (!Enum.TryParse<WorkMode>(dto.WorkMode, true, out var parsedMode))
            return BadRequest("Invalid WorkMode. Use OnSite, Remote, or Hybrid.");

        opportunity.Title = dto.Title.Trim();
        opportunity.CompanyName = dto.CompanyName.Trim();
        opportunity.Location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim();
        opportunity.IsRemote = parsedMode == WorkMode.Remote;
        opportunity.WorkMode = parsedMode;
        opportunity.LocationName = string.IsNullOrWhiteSpace(dto.LocationName) ? null : dto.LocationName.Trim();
        opportunity.FullAddress = string.IsNullOrWhiteSpace(dto.FullAddress) ? null : dto.FullAddress.Trim();
        opportunity.Latitude = dto.Latitude;
        opportunity.Longitude = dto.Longitude;
        opportunity.ResponsibilitiesJson = WriteList(dto.Responsibilities);
        opportunity.PreferredSkillsJson = WriteList(dto.PreferredSkills);
        opportunity.BenefitsJson = WriteList(dto.Benefits);
        opportunity.AssessmentJson = dto.Assessment == null ? null : JsonSerializer.Serialize(dto.Assessment);
        opportunity.Type = parsedType;
        opportunity.Level = parsedLevel;
        opportunity.MinPay = dto.MinPay;
        opportunity.MaxPay = dto.MaxPay;
        opportunity.Description = dto.Description;
        opportunity.DeadlineUtc = dto.DeadlineUtc;

        await _db.SaveChangesAsync();

        var extracted = await _mlSkillClient.ExtractOpportunitySkillsAsync(
            $"{opportunity.Title} {opportunity.Description}".Trim(),
            null
        );

        if (extracted != null && extracted.Any())
        {
            await _skillService.SaveOpportunitySkillsAsync(opportunity.Id, extracted);
        }
        else
        {
            await ReplaceSkills(opportunity.Id, dto.PreferredSkills ?? new List<string>());
        }

        return NoContent();
    }

    [Authorize(Roles = "Recruiter")]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var opportunity = await _db.Opportunities.FirstOrDefaultAsync(o => o.Id == id);
        if (opportunity == null) return NotFound();

        var joins = await _db.OpportunitySkills.Where(os => os.OpportunityId == id).ToListAsync();
        _db.OpportunitySkills.RemoveRange(joins);

        var saved = await _db.SavedOpportunities.Where(s => s.OpportunityId == id).ToListAsync();
        _db.SavedOpportunities.RemoveRange(saved);

        var questions = await _db.OpportunityQuestions.Where(q => q.OpportunityId == id).ToListAsync();
        _db.OpportunityQuestions.RemoveRange(questions);

        _db.Opportunities.Remove(opportunity);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [Authorize(Roles = "Student")]
    [HttpPost("{id:int}/apply")]
    public async Task<IActionResult> ApplyNow(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var oppExists = await _db.Opportunities.AnyAsync(o => o.Id == id);
        if (!oppExists) return NotFound("Opportunity not found.");

        var existing = await _db.Applications
            .FirstOrDefaultAsync(a => a.OpportunityId == id && a.StudentUserId == userId && a.Status != ApplicationStatus.Withdrawn);

        if (existing != null)
            return Ok(new { applicationId = existing.Id, status = existing.Status.ToString() });

        var app = new Application
        {
            OpportunityId = id,
            StudentUserId = userId,
            Status = ApplicationStatus.Draft,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Applications.Add(app);
        await _db.SaveChangesAsync();

        return Ok(new { applicationId = app.Id, status = app.Status.ToString() });
    }

    private async Task ReplaceSkills(int opportunityId, List<string> skills)
    {
        var skillNames = (skills ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var existingJoins = await _db.OpportunitySkills.Where(os => os.OpportunityId == opportunityId).ToListAsync();
        _db.OpportunitySkills.RemoveRange(existingJoins);
        await _db.SaveChangesAsync();

        if (skillNames.Count == 0) return;

        var existingSkills = await _db.Skills
            .Where(s => skillNames.Contains(s.Name))
            .ToListAsync();

        var existingNames = existingSkills.Select(s => s.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var missing = skillNames
            .Where(n => !existingNames.Contains(n))
            .Select(n => new Skill { Name = n })
            .ToList();

        if (missing.Count > 0)
        {
            _db.Skills.AddRange(missing);
            await _db.SaveChangesAsync();
            existingSkills.AddRange(missing);
        }

        var joinsToAdd = existingSkills.Select(s => new OpportunitySkill
        {
            OpportunityId = opportunityId,
            SkillId = s.Id
        });

        _db.OpportunitySkills.AddRange(joinsToAdd);
        await _db.SaveChangesAsync();
    }
    private static int CalculateMatchPercentage(List<string> applicantSkills, List<string> opportunitySkills)
    {
        if (opportunitySkills == null || opportunitySkills.Count == 0)
            return 0;

        if (applicantSkills == null || applicantSkills.Count == 0)
            return 0;

        var applicantSet = applicantSkills
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim().ToLower())
            .ToHashSet();

        var opportunitySet = opportunitySkills
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim().ToLower())
            .ToHashSet();

        if (opportunitySet.Count == 0)
            return 0;

        var matchedCount = opportunitySet.Count(skill => applicantSet.Contains(skill));

        return (int)Math.Round((double)matchedCount * 100 / opportunitySet.Count);
    }

    private async Task<List<string>> GetStudentSkillNames(string userId)
    {
        return await _db.StudentSkills
            .AsNoTracking()
            .Where(ss => ss.StudentUserId == userId && ss.SkillId != null)
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
    }

    private static List<string> ReadList(string? json)
        => string.IsNullOrWhiteSpace(json)
            ? new List<string>()
            : (JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>());

    private static string? WriteList(List<string>? list)
    {
        if (list == null) return null;

        var cleaned = list
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return cleaned.Count == 0 ? null : JsonSerializer.Serialize(cleaned);
    }

    [Authorize(Roles = "Recruiter")]
    [HttpPatch("{id:int}/close")]
    public async Task<IActionResult> Close(int id)
    {
        var opportunity = await _db.Opportunities.FirstOrDefaultAsync(o => o.Id == id);
        if (opportunity == null) return NotFound();

        if (opportunity.IsClosed) return BadRequest("Opportunity already closed.");

        opportunity.IsClosed = true;
        opportunity.ClosedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Recruiter")]
    [HttpPatch("{id:int}/reopen")]
    public async Task<IActionResult> Reopen(int id)
    {
        var opportunity = await _db.Opportunities.FirstOrDefaultAsync(o => o.Id == id);
        if (opportunity == null) return NotFound();

        opportunity.IsClosed = false;
        opportunity.ClosedAtUtc = null;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("company/{companyName}")]
    public async Task<ActionResult<List<OpportunityCardDto>>> GetByCompany(string companyName)
    {
        if (string.IsNullOrWhiteSpace(companyName))
            return BadRequest("Company name required.");

        var opportunities = await _db.Opportunities
            .AsNoTracking()
            .Include(o => o.OpportunitySkills)
                .ThenInclude(os => os.Skill)
            .Where(o => o.CompanyName == companyName && !o.IsClosed)
            .OrderByDescending(o => o.CreatedAtUtc)
            .Select(o => new OpportunityCardDto
            {
                Id = o.Id,
                Title = o.Title,
                CompanyName = o.CompanyName,
                Location = o.Location,
                IsRemote = o.IsRemote,
                WorkMode = o.WorkMode.ToString(),
                Type = o.Type.ToString(),
                Level = o.Level.ToString(),
                MinPay = o.MinPay,
                MaxPay = o.MaxPay,
                CreatedAtUtc = o.CreatedAtUtc,
                DeadlineUtc = o.DeadlineUtc,
                Skills = o.OpportunitySkills
                    .Where(os => os.Skill != null && !string.IsNullOrWhiteSpace(os.Skill.Name))
                    .Select(os => os.Skill!.Name)
                    .ToList(),
                AssessmentTimeLimitSeconds = o.AssessmentTimeLimitSeconds,
                AssessmentMcqCount = o.AssessmentMcqCount,
                AssessmentChallengeCount = o.AssessmentChallengeCount,
                MatchPercentage = 0,
                ApplicantCount = _db.Applications.Count(a => a.OpportunityId == o.Id && a.Status != ApplicationStatus.Withdrawn),
            })
            .ToListAsync();

        return Ok(opportunities);
    }

    [Authorize]
    [HttpPost("repair-skills")]
    public async Task<IActionResult> RepairSkills()
    {
        var opportunities = await _db.Opportunities.ToListAsync();

        foreach (var opportunity in opportunities)
        {
            var extracted = await _mlSkillClient.ExtractOpportunitySkillsAsync(
                $"{opportunity.Title} {opportunity.Description}".Trim(),
                null
            );

            if (extracted != null && extracted.Any())
            {
                await _skillService.SaveOpportunitySkillsAsync(opportunity.Id, extracted);
            }
            else
            {
                var preferredSkills = ReadList(opportunity.PreferredSkillsJson);
                await ReplaceSkills(opportunity.Id, preferredSkills);
            }
        }

        return Ok(new { message = "Opportunity skills repaired." });
    }

    [Authorize(Roles = "Recruiter")]
    [HttpGet("my")]
    public async Task<ActionResult<List<OpportunityCardDto>>> GetMyListings()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var opportunities = await _db.Opportunities
            .AsNoTracking()
            .Include(o => o.OpportunitySkills)
                .ThenInclude(os => os.Skill)
            .Where(o => o.RecruiterUserId == userId)
            .OrderByDescending(o => o.CreatedAtUtc)
            .Select(o => new OpportunityCardDto
            {
                Id = o.Id,
                Title = o.Title,
                CompanyName = o.CompanyName,
                Location = o.Location,
                IsRemote = o.IsRemote,
                WorkMode = o.WorkMode.ToString(),
                Type = o.Type.ToString(),
                Level = o.Level.ToString(),
                MinPay = o.MinPay,
                MaxPay = o.MaxPay,
                CreatedAtUtc = o.CreatedAtUtc,
                DeadlineUtc = o.DeadlineUtc,
                Skills = o.OpportunitySkills
                    .Where(os => os.Skill != null && !string.IsNullOrWhiteSpace(os.Skill.Name))
                    .Select(os => os.Skill!.Name)
                    .ToList(),
                AssessmentTimeLimitSeconds = o.AssessmentTimeLimitSeconds,
                AssessmentMcqCount = o.AssessmentMcqCount,
                AssessmentChallengeCount = o.AssessmentChallengeCount,
                MatchPercentage = 0,
                ApplicantCount = _db.Applications.Count(a =>
                    a.OpportunityId == o.Id &&
                    a.Status != ApplicationStatus.Withdrawn)
            })
            .ToListAsync();

        return Ok(opportunities);
    }

    [Authorize]
    [HttpPost("{id:int}/report")]
    public async Task<IActionResult> ReportOpportunity(int id, [FromBody] CreateOpportunityReportDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var opportunity = await _db.Opportunities.FindAsync(id);
        if (opportunity == null)
            return NotFound("Opportunity not found");

        var report = new OpportunityReport
        {
            OpportunityId = id,
            ReporterUserId = userId!,
            Reason = dto.Reason,
            Details = dto.Details,
            CreatedAt = DateTime.UtcNow
        };

        _db.OpportunityReports.Add(report);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Report submitted" });
    }
}
