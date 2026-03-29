using System.Text.Json;

namespace Jobify.Tests.BussinessLogic;

public static class AssessmentScoringHelper
{
    public static decimal ComputeMcqScore(string assessmentJson, string answersJson)
    {
        try
        {
            using var assessmentDoc = JsonDocument.Parse(assessmentJson);
            using var answersDoc = JsonDocument.Parse(
                string.IsNullOrWhiteSpace(answersJson) ? "{}" : answersJson
            );

            if (!assessmentDoc.RootElement.TryGetProperty("questions", out var qs) ||
                qs.ValueKind != JsonValueKind.Array)
                return 0;

            int totalMcq = 0;
            int correct = 0;

            foreach (var q in qs.EnumerateArray())
            {
                var type = q.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String
                    ? t.GetString()
                    : "mcq";

                if (!string.Equals(type, "mcq", StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!q.TryGetProperty("id", out var idEl) || idEl.ValueKind != JsonValueKind.String)
                    continue;

                var qid = idEl.GetString();
                if (string.IsNullOrWhiteSpace(qid))
                    continue;

                if (!q.TryGetProperty("correctIndex", out var cEl) || cEl.ValueKind != JsonValueKind.Number)
                    continue;

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
        catch
        {
            return 0;
        }
    }
}