import type { AIProvider, ProviderConfig } from "./providers/types";
import { OllamaProvider } from "./providers/ollama";
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai-provider";
import { GroqProvider } from "./providers/groq";
import { WebLLMProvider } from "./providers/web-llm";
import { ServerProxyProvider } from "./providers/server-proxy";
import { withRetry } from "./providers/with-retry";
import { loadProviderConfig } from "./providers/types";

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case "ollama":
      return new OllamaProvider(config.model, config.baseUrl);
    case "gemini":
      if (!config.apiKey) throw new Error("Gemini requires an API key");
      return new GeminiProvider(config.apiKey, config.model);
    case "openai":
      if (!config.apiKey) throw new Error("OpenAI requires an API key");
      return new OpenAIProvider(config.apiKey, config.model, config.baseUrl);
    case "groq":
      if (!config.apiKey) throw new Error("Groq requires an API key");
      return new GroqProvider(config.apiKey, config.model);
    case "webllm":
      return new WebLLMProvider(config.model);
    case "server-proxy":
      return new ServerProxyProvider(config.model);
    default:
      throw new Error(`Unknown provider: ${config.type}`);
  }
}

/**
 * Returns the best available AI provider with the following priority:
 * 1. User-configured BYO key provider (stored in localStorage)
 * 2. WebLLM (in-browser via WebGPU) — if supported
 * 3. Server proxy via OpenRouter (free cloud fallback)
 *
 * All providers are wrapped with retry-on-429 logic.
 * Returns null only in SSR contexts (no window).
 */
export function getConfiguredProvider(): AIProvider | null {
  // SSR guard
  if (typeof window === "undefined") return null;

  // 1. Check for BYO-key config in localStorage
  const config = loadProviderConfig();
  if (config) {
    try {
      const byo = createProvider(config);
      return withRetry(byo);
    } catch {
      // invalid config — fall through to auto-selection
    }
  }

  // 2. WebGPU available → use in-browser WebLLM
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    return withRetry(new WebLLMProvider());
  }

  // 3. Fallback → server-side proxy (OpenRouter free tier)
  return withRetry(new ServerProxyProvider());
}

/** Returns a human-readable description of what provider will be used (for UI). */
export function getAutoProviderDescription(): {
  label: string;
  detail: string;
  isLocal: boolean;
} {
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    return {
      label: "Free AI (local)",
      detail: "Using your device's GPU — no API key needed",
      isLocal: true,
    };
  }
  return {
    label: "Free AI (cloud)",
    detail: "Using free server-side model — no API key needed",
    isLocal: false,
  };
}
