import type { AIProvider, Message, GenerateOptions, ModelInfo } from "./types";
import { parseOpenAIStream } from "./openai-provider";

const GROQ_API_BASE = "https://api.groq.com/openai/v1";

export class GroqProvider implements AIProvider {
  id = "groq" as const;
  name = "Groq";
  description = "Free tier available. Extremely fast inference.";
  isLocal = false;

  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "llama-3.1-8b-instant") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${GROQ_API_BASE}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", description: "Fast, free tier" },
      { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", description: "More capable" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", description: "Strong reasoning" },
    ];
  }

  private buildBody(
    messages: Message[],
    options?: GenerateOptions,
    stream = false
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      stream,
    };
    if (options?.jsonMode) {
      body.response_format = { type: "json_object" };
    }
    return body;
  }

  async generate(
    messages: Message[],
    options?: GenerateOptions
  ): Promise<string> {
    const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(this.buildBody(messages, options, false)),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq error (${res.status}): ${text}`);
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? "";
  }

  async *generateStream(
    messages: Message[],
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(this.buildBody(messages, options, true)),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq error (${res.status}): ${text}`);
    }

    yield* parseOpenAIStream(res);
  }
}
