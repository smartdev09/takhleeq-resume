export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  isLocal: boolean;
  isAvailable(): Promise<boolean>;
  generate(messages: Message[], options?: GenerateOptions): Promise<string>;
  generateStream?(messages: Message[], options?: GenerateOptions): AsyncGenerator<string>;
  listModels?(): Promise<ModelInfo[]>;
  pullModel?(modelId: string, onProgress?: (progress: PullProgress) => void): Promise<void>;
}

export interface ModelInfo {
  id: string;
  name: string;
  size?: string;
  description?: string;
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
  percent: number;
}

export type ProviderType =
  | "ollama"
  | "gemini"
  | "openai"
  | "groq"
  | "webllm"
  | "server-proxy";

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const STORAGE_KEY = "open-resume-ai-provider";

export function loadProviderConfig(): ProviderConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProviderConfig(config: ProviderConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearProviderConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
