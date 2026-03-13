using Jobify.Api.DTOs;
using Jobify.Api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Jobify.Api.Services
{
    public class RecommendationService
    {
        private const double THRESHOLD = 0.0; //change it to whatever suitable i was testing

        private static readonly Dictionary<string, string> SynonymMap = new()
        {
            { "js", "javascript" },
            { "reactjs", "react" },
            { "node", "node.js" }
        };

        private static string Normalize(string s)
        {
            s = (s ?? "").ToLower().Trim();
            return SynonymMap.TryGetValue(s, out var mapped) ? mapped : s;
        }

        // Uses reflection so it works even if your model property names differ
        private static double GetWeight(object obj, double fallback = 1)
        {
            var prop = obj.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(p => string.Equals(p.Name, "Weight", StringComparison.OrdinalIgnoreCase));
            if (prop == null) return fallback;

            var val = prop.GetValue(obj);
            if (val == null) return fallback;

            // handle decimal/int/double
            try { return Convert.ToDouble(val); } catch { return fallback; }
        }

        private static bool GetMandatory(object obj, bool fallback = false)
        {
            var prop = obj.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(p =>
                    string.Equals(p.Name, "Mandatory", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p.Name, "IsMandatory", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p.Name, "Required", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p.Name, "IsRequired", StringComparison.OrdinalIgnoreCase));

            if (prop == null) return fallback;

            var val = prop.GetValue(obj);
            if (val == null) return fallback;

            try { return Convert.ToBoolean(val); } catch { return fallback; }
        }

        public List<RecommendedOpportunityDto> Recommend(
            List<SkillInputDto> applicantSkills,
            List<Opportunity> opportunities)
        {
            // applicantMap: normalized skill -> weight
            var applicantMap = new Dictionary<string, double>();

            foreach (var s in applicantSkills ?? new())
            {
                var name = Normalize(s.Name);
                if (string.IsNullOrWhiteSpace(name)) continue;

                var w = s.Weight <= 0 ? 1 : s.Weight;

                // if duplicate, keep highest weight
                if (!applicantMap.ContainsKey(name) || applicantMap[name] < w)
                    applicantMap[name] = w;
            }

            var results = new List<RecommendedOpportunityDto>();

            foreach (var opp in opportunities ?? new())
            {
                var oppSkills = opp.OpportunitySkills ?? new List<OpportunitySkill>();

                // 1) Filter missing mandatory skills (if your model supports mandatory/required)
                bool missingMandatory = false;
                foreach (var os in oppSkills)
                {
                    bool isMandatory = GetMandatory(os, fallback: false); // if you don't have the field, it's treated as false
                    if (!isMandatory) continue;

                    var skillName = Normalize(os.Skill?.Name ?? "");
                    if (!applicantMap.ContainsKey(skillName))
                    {
                        missingMandatory = true;
                        break;
                    }
                }
                if (missingMandatory) continue;

                // 2) Weighted score
                double totalWeight = 0;
                double matchedWeight = 0;
                var matched = new List<string>();

                foreach (var os in oppSkills)
                {
                    var skillName = Normalize(os.Skill?.Name ?? "");
                    if (string.IsNullOrWhiteSpace(skillName)) continue;

                    var reqWeight = GetWeight(os, fallback: 1);
                    if (reqWeight <= 0) reqWeight = 1;

                    totalWeight += reqWeight;

                    if (applicantMap.TryGetValue(skillName, out var appWeight))
                    {
                        matchedWeight += reqWeight * Math.Min(1.0, appWeight);
                        matched.Add(skillName);
                    }
                }

                if (totalWeight <= 0) continue;

                var score = matchedWeight / totalWeight;

                if (score >= THRESHOLD)
                {
                    results.Add(new RecommendedOpportunityDto
                    {
                        OpportunityId = opp.Id,
                        Title = opp.Title ?? "",
                        Score = Math.Round(score, 4),
                        MatchedSkills = matched.Distinct().ToList()
                    });
                }
            }

            return results.OrderByDescending(r => r.Score).ToList();
        }
    }
}
