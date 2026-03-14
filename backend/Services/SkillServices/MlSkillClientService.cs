using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace Jobify.Api.Services.SkillServices
{
    public class MlSkillClient
    {
        private readonly HttpClient _httpClient;

        public MlSkillClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        // ============================
        // Extract skills from CV text
        // ============================
        public async Task<List<string>> ExtractCvSkillsAsync(string cvText)
        {
            var response = await _httpClient.PostAsJsonAsync(
                "/extract/cv",
                new { text = cvText }
            );

            response.EnsureSuccessStatusCode();

            return await ReadSkillsAsync(response.Content);
        }

        // ============================
        // Extract skills from CV file
        // ============================
        public async Task<List<string>> ExtractCvSkillsFromFileAsync(IFormFile file)
        {
            using var form = new MultipartFormDataContent();

            using var stream = file.OpenReadStream();
            using var fileContent = new StreamContent(stream);

            fileContent.Headers.ContentType =
                new MediaTypeHeaderValue(file.ContentType);

            // must match FastAPI parameter name
            form.Add(fileContent, "file", file.FileName);

            var response = await _httpClient.PostAsync(
                "/extract/cv-file",
                form
            );

            response.EnsureSuccessStatusCode();

            return await ReadSkillsAsync(response.Content);
        }

        // ============================
        // Extract opportunity skills
        // ============================
        public async Task<List<string>> ExtractOpportunitySkillsAsync(
            string description,
            string? requirements)
        {
            var response = await _httpClient.PostAsJsonAsync(
                "/extract/opportunity",
                new { description, requirements }
            );

            response.EnsureSuccessStatusCode();

            return await ReadSkillsAsync(response.Content);
        }

        private static async Task<List<string>> ReadSkillsAsync(HttpContent content)
        {
            await using var stream = await content.ReadAsStreamAsync();
            using var document = await JsonDocument.ParseAsync(stream);

            var skillsElement = document.RootElement;

            if (skillsElement.ValueKind == JsonValueKind.Object &&
                skillsElement.TryGetProperty("skills", out var nestedSkills))
            {
                skillsElement = nestedSkills;
            }

            if (skillsElement.ValueKind != JsonValueKind.Array)
                return new List<string>();

            var skills = new List<string>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in skillsElement.EnumerateArray())
            {
                string? skillName = item.ValueKind switch
                {
                    JsonValueKind.String => item.GetString(),
                    JsonValueKind.Object => ReadSkillName(item),
                    _ => null
                };

                if (string.IsNullOrWhiteSpace(skillName))
                    continue;

                var normalized = skillName.Trim();
                if (seen.Add(normalized))
                    skills.Add(normalized);
            }

            return skills;
        }

        private static string? ReadSkillName(JsonElement skillElement)
        {
            if (skillElement.TryGetProperty("skill", out var skillProperty) &&
                skillProperty.ValueKind == JsonValueKind.String)
            {
                return skillProperty.GetString();
            }

            if (skillElement.TryGetProperty("name", out var nameProperty) &&
                nameProperty.ValueKind == JsonValueKind.String)
            {
                return nameProperty.GetString();
            }

            return null;
        }
    }
}
