import type { AIProvider, Message, GenerateOptions } from "./types";

const ENDPOINT = "/api/agent/generate";
const DEFAULT_MODEL = "meta-llama/llama-3.2-3b-instruct:free";

export class RateLimitError extends Error {
  readonly type = "rate_limited" as const;
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter}s.`);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ServerProxyProvider implements AIProvider {
  id = "server-proxy" as const;
  name = "Free AI (Cloud)";
  description =
    "Free tier via server proxy. No API key needed. Limited to 50 calls/day.";
  isLocal = false;

  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    return typeof window !== "undefined";
  }

  async generate(
    messages: Message[],
    options?: GenerateOptions
  ): Promise<string> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model: this.model,
        temperature: options?.temperature ?? 0.3,
        maxTokens: options?.maxTokens ?? 4096,
        jsonMode: options?.jsonMode ?? false,
      }),
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
      throw new RateLimitError(retryAfter);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server proxy error (${res.status}): ${text}`);
    }

    // Drain SSE stream and return full text
    const reader = res.body?.getReader();
    if (!reader) return "";

    const decoder = new TextDecoder();
    let buffer = "";
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const chunk = parsed.choices?.[0]?.delta?.content ?? "";
          result += chunk;
        } catch {
          // skip malformed
        }
      }
    }

    return result;
  }

  async *generateStream(
    messages: Message[],
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model: this.model,
        temperature: options?.temperature ?? 0.3,
        maxTokens: options?.maxTokens ?? 4096,
        jsonMode: options?.jsonMode ?? false,
      }),
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
      throw new RateLimitError(retryAfter);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server proxy error (${res.status}): ${text}`);
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
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const chunk = parsed.choices?.[0]?.delta?.content ?? "";
          if (chunk) yield chunk;
        } catch {
          // skip malformed
        }
      }
    }
  }
}
