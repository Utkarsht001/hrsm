using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace HRMS.Infrastructure.Ai;

/// <summary>
/// OpenAI Chat Completions-compatible client for the Emergent integration gateway.
/// Routes requests to https://integrations.emergentagent.com/llm/chat/completions
/// using the EMERGENT_LLM_KEY — works across Anthropic, OpenAI, and Gemini models
/// without per-provider SDK code.
/// </summary>
public class EmergentLlmClient(HttpClient http, string apiKey, string model = "claude-sonnet-4-5-20250929")
{
    private const string Endpoint = "https://integrations.emergentagent.com/llm/chat/completions";

    public async Task<string> ChatAsync(string systemPrompt, IEnumerable<(string role, string text)> messages, CancellationToken ct = default)
    {
        var msgList = new List<ChatMessage> { new() { Role = "system", Content = systemPrompt } };
        msgList.AddRange(messages.Select(m => new ChatMessage { Role = m.role, Content = m.text }));

        var body = new ChatRequest { Model = model, Messages = msgList, MaxTokens = 1024 };

        using var req = new HttpRequestMessage(HttpMethod.Post, Endpoint);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var res = await http.SendAsync(req, ct);
        var raw = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
            throw new HttpRequestException($"LLM gateway error {(int)res.StatusCode}: {raw}");

        var parsed = JsonSerializer.Deserialize<ChatResponse>(raw)!;
        return parsed.Choices.FirstOrDefault()?.Message?.Content ?? "";
    }

    private class ChatRequest
    {
        [JsonPropertyName("model")]      public string Model { get; set; } = "";
        [JsonPropertyName("messages")]   public List<ChatMessage> Messages { get; set; } = new();
        [JsonPropertyName("max_tokens")] public int MaxTokens { get; set; }
    }
    private class ChatMessage
    {
        [JsonPropertyName("role")]    public string Role { get; set; } = "";
        [JsonPropertyName("content")] public string Content { get; set; } = "";
    }
    private class ChatResponse
    {
        [JsonPropertyName("choices")] public List<Choice> Choices { get; set; } = new();
    }
    private class Choice
    {
        [JsonPropertyName("message")] public ChatMessage? Message { get; set; }
    }
}
