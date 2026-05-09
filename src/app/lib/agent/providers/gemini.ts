import type { AIProvider, Message, GenerateOptions, ModelInfo } from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiProvider implements AIProvider {
  id = "gemini" as const;
  name = "Google Gemini";
  description = "Free tier: 15 requests/minute. Get a key from Google AI Studio.";
  isLocal = false;

  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-1.5-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${GEMINI_API_BASE}/models`, {
        headers: { "x-goog-api-key": this.apiKey },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast and free" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "More capable, free tier" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Latest fast model" },
    ];
  }

  private buildRequestBody(
    messages: Message[],
    options?: GenerateOptions
  ): { body: Record<string, unknown>; systemInstruction?: { parts: Array<{ text: string }> } } {
    const systemInstruction = messages.find((m) => m.role === "system");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 4096,
        ...(options?.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction.content }],
      };
    }

    return { body };
  }

  async generate(
    messages: Message[],
    options?: GenerateOptions
  ): Promise<string> {
    const { body } = this.buildRequestBody(messages, options);

    // P4-8: use x-goog-api-key header instead of query param
    const res = await fetch(
      `${GEMINI_API_BASE}/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini error (${res.status}): ${text}`);
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  async *generateStream(
    messages: Message[],
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const { body } = this.buildRequestBody(messages, options);

    const res = await fetch(
      `${GEMINI_API_BASE}/models/${this.model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini error (${res.status}): ${text}`);
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const parsed = JSON.parse(data) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text) yield text;
        } catch {
          // skip malformed
        }
      }
    }
  }
}
