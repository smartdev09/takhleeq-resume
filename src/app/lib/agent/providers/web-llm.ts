import type { AIProvider, Message, GenerateOptions } from "./types";

const DEFAULT_MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

// Singleton engine – reused across calls once loaded
let cachedEngine: unknown = null;
let cachedModelId: string | null = null;

export class WebLLMProvider implements AIProvider {
  id = "webllm" as const;
  name = "WebLLM (In-Browser)";
  description =
    "Free. Runs in your browser using WebGPU. Downloads ~1.7 GB on first use.";
  isLocal = true;

  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    return typeof navigator !== "undefined" && "gpu" in navigator;
  }

  async generate(
    messages: Message[],
    options?: GenerateOptions
  ): Promise<string> {
    const engine = await this.getEngine();
    const resp = await (engine as Record<string, unknown> & {
      chat: {
        completions: {
          create: (params: Record<string, unknown>) => Promise<{
            choices: Array<{ message: { content: string } }>;
          }>;
        };
      };
    }).chat.completions.create({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.jsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
    });
    return resp.choices[0]?.message.content ?? "";
  }

  async *generateStream(
    messages: Message[],
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const engine = await this.getEngine();
    const stream = await (engine as Record<string, unknown> & {
      chat: {
        completions: {
          create: (params: Record<string, unknown>) => Promise<
            AsyncIterable<{
              choices: Array<{ delta: { content?: string } }>;
            }>
          >;
        };
      };
    }).chat.completions.create({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta.content ?? "";
      if (delta) yield delta;
    }
  }

  private async getEngine(): Promise<unknown> {
    if (cachedEngine && cachedModelId === this.model) {
      return cachedEngine;
    }

    const { CreateMLCEngine } = (await import(
      "@mlc-ai/web-llm"
    )) as typeof import("@mlc-ai/web-llm");

    const engine = await CreateMLCEngine(this.model, {
      initProgressCallback: (report: { progress: number; text: string }) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("webllm:progress", {
              detail: { progress: report.progress, text: report.text },
            })
          );
        }
      },
    });

    cachedEngine = engine;
    cachedModelId = this.model;
    return engine;
  }
}
