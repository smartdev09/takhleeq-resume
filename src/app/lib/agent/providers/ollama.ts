import type {
  AIProvider,
  Message,
  GenerateOptions,
  ModelInfo,
  PullProgress,
} from "./types";

const DEFAULT_BASE_URL = "http://localhost:11434";

export class OllamaProvider implements AIProvider {
  id = "ollama" as const;
  name = "Ollama (Local)";
  description = "Runs on your machine. Your data never leaves your computer.";
  isLocal = true;

  private baseUrl: string;
  private model: string;

  constructor(
    model: string = "llama3.1:8b",
    baseUrl: string = DEFAULT_BASE_URL
  ) {
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error("Failed to list Ollama models");
    const data = await res.json();
    return (data.models ?? []).map(
      (m: { name: string; size: number; details?: { parameter_size?: string } }) => ({
        id: m.name,
        name: m.name,
        size: m.details?.parameter_size ?? formatBytes(m.size),
      })
    );
  }

  async pullModel(
    modelId: string,
    onProgress?: (progress: PullProgress) => void
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelId, stream: true }),
    });

    if (!res.ok) throw new Error(`Failed to pull model: ${res.statusText}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (onProgress) {
            const completed = data.completed ?? 0;
            const total = data.total ?? 1;
            onProgress({
              status: data.status ?? "downloading",
              completed,
              total,
              percent: total > 0 ? Math.round((completed / total) * 100) : 0,
            });
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  async *generateStream(
    messages: Message[],
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    // Ollama streaming: yield the full response as one chunk for simplicity
    const result = await this.generate(messages, options);
    yield result;
  }

  async generate(
    messages: Message[],
    options?: GenerateOptions
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.3,
          num_predict: options?.maxTokens ?? 4096,
        },
        ...(options?.jsonMode ? { format: "json" } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.message?.content ?? "";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1e9) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e9).toFixed(1)} GB`;
}

export const RECOMMENDED_MODELS: ModelInfo[] = [
  {
    id: "llama3.1:8b",
    name: "Llama 3.1 8B",
    size: "4.7 GB",
    description: "Best balance of speed and quality",
  },
  {
    id: "phi3:mini",
    name: "Phi-3 Mini",
    size: "2.3 GB",
    description: "Lighter and faster, good for weaker hardware",
  },
  {
    id: "mistral:7b",
    name: "Mistral 7B",
    size: "4.1 GB",
    description: "Strong general-purpose model",
  },
  {
    id: "gemma2:9b",
    name: "Gemma 2 9B",
    size: "5.4 GB",
    description: "Google's efficient open model",
  },
];
