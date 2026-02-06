using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Jobify.Api.Models;

namespace Jobify.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OpportunitiesController : ControllerBase
{
    private readonly AppDbContext _db;

    public OpportunitiesController(AppDbContext db)
    {
        _db = db;
    }

    // =========================
    // GET LIST (PUBLIC)
    // =========================
    // GET: /api/opportunities?q=&type=&level=&remote=&location=&skills=&minPay=&maxPay=&sort=&page=&pageSize=
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
        [FromQuery] string? sort = "newest",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10
    )
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 50) pageSize = 50;

        var query = _db.Opportunities
            .AsNoTracking()
            .Include(o => o.OpportunitySkills)
                .ThenInclude(os => os.Skill)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim().ToLower();
            query = query.Where(o =>
                o.Title.ToLower().Contains(s) ||
                o.CompanyName.ToLower().Contains(s) ||
                o.OpportunitySkills.Any(os => os.Skill != null && os.Skill.Name.ToLower().Contains(s))
            );
        }

        // ✅ FIX: Don't use ToString() in WHERE (EF can't translate it)
        // Parse the string into enum and compare enum-to-enum.
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

        // ✅ FIX: Frontend sends Beginner/Intermediate/Senior but backend enum is Intern/Entry/Junior/Senior
        // Map UI -> enum, and also allow enum names.
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

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OpportunityCardDto
            {
                Id = o.Id,
                Title = o.Title,
                CompanyName = o.CompanyName,
                Location = o.Location,
                IsRemote = o.IsRemote,
                Type = o.Type.ToString(),
                Level = o.Level.ToString(),
                MinPay = o.MinPay,
                MaxPay = o.MaxPay,
                CreatedAtUtc = o.CreatedAtUtc,
                DeadlineUtc = o.DeadlineUtc,
                Skills = o.OpportunitySkills
                    .Where(os => os.Skill != null)
                    .Select(os => os.Skill!.Name)
                    .ToList(),
                MatchPercent = null
            })
            .ToListAsync();

        return Ok(new PagedResult<OpportunityCardDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        });
    }

    // =========================
    // GET BY ID (PUBLIC)
    // =========================
    [HttpGet("{id:int}")]
    public async Task<ActionResult<OpportunityCardDto>> GetById(int id)
    {
        var o = await _db.Opportunities
            .AsNoTracking()
            .Include(x => x.OpportunitySkills)
                .ThenInclude(os => os.Skill)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (o == null) return NotFound();

        return Ok(new OpportunityCardDto
        {
            Id = o.Id,
            Title = o.Title,
            CompanyName = o.CompanyName,
            Location = o.Location,
            IsRemote = o.IsRemote,
            Type = o.Type.ToString(),
            Level = o.Level.ToString(),
            MinPay = o.MinPay,
            MaxPay = o.MaxPay,
            CreatedAtUtc = o.CreatedAtUtc,
            DeadlineUtc = o.DeadlineUtc,
            Skills = o.OpportunitySkills
                .Where(os => os.Skill != null)
                .Select(os => os.Skill!.Name)
                .ToList(),
            MatchPercent = null
        });
    }

    // =========================
    // CREATE (RECRUITER ONLY)
    // =========================
    [Authorize(Roles = "Recruiter")]
    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateOpportunityDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.CompanyName))
            return BadRequest("Title and CompanyName are required.");

        if (!Enum.TryParse<OpportunityType>(dto.Type, true, out var parsedType))
            return BadRequest("Invalid Type.");

        if (!Enum.TryParse<ExperienceLevel>(dto.Level, true, out var parsedLevel))
            return BadRequest("Invalid Level.");

        var opportunity = new Opportunity
        {
            Title = dto.Title.Trim(),
            CompanyName = dto.CompanyName.Trim(),
            Location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim(),
            IsRemote = dto.IsRemote,
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

        await ReplaceSkills(opportunity.Id, dto.Skills);

        return CreatedAtAction(nameof(GetById), new { id = opportunity.Id }, new { opportunity.Id });
    }

    // =========================
    // UPDATE (RECRUITER ONLY)
    // =========================
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

        opportunity.Title = dto.Title.Trim();
        opportunity.CompanyName = dto.CompanyName.Trim();
        opportunity.Location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim();
        opportunity.IsRemote = dto.IsRemote;
        opportunity.Type = parsedType;
        opportunity.Level = parsedLevel;
        opportunity.MinPay = dto.MinPay;
        opportunity.MaxPay = dto.MaxPay;
        opportunity.Description = dto.Description;
        opportunity.DeadlineUtc = dto.DeadlineUtc;

        await _db.SaveChangesAsync();

        await ReplaceSkills(opportunity.Id, dto.Skills);

        return NoContent();
    }

    // =========================
    // DELETE (RECRUITER ONLY)
    // =========================
    [Authorize(Roles = "Recruiter")]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var opportunity = await _db.Opportunities.FirstOrDefaultAsync(o => o.Id == id);
        if (opportunity == null) return NotFound();

        // remove joins first
        var joins = await _db.OpportunitySkills.Where(os => os.OpportunityId == id).ToListAsync();
        _db.OpportunitySkills.RemoveRange(joins);

        _db.Opportunities.Remove(opportunity);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // =========================
    // Helper: replace skills for an opportunity
    // =========================
    private async Task ReplaceSkills(int opportunityId, List<string> skills)
    {
        // normalize
        var skillNames = (skills ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        // clear existing joins
        var existingJoins = await _db.OpportunitySkills.Where(os => os.OpportunityId == opportunityId).ToListAsync();
        _db.OpportunitySkills.RemoveRange(existingJoins);
        await _db.SaveChangesAsync();

        if (skillNames.Count == 0) return;

        // fetch existing skills
        var existingSkills = await _db.Skills
            .Where(s => skillNames.Contains(s.Name))
            .ToListAsync();

        var existingNames = existingSkills.Select(s => s.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // create missing
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

        // create joins
        var joinsToAdd = existingSkills.Select(s => new OpportunitySkill
        {
            OpportunityId = opportunityId,
            SkillId = s.Id
        });

        _db.OpportunitySkills.AddRange(joinsToAdd);
        await _db.SaveChangesAsync();
    }
}
