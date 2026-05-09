import type { AIProvider, ProviderConfig } from "./types";
import { OllamaProvider } from "./ollama";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai-provider";
import { GroqProvider } from "./groq";
import { WebLLMProvider } from "./web-llm";
import { ServerProxyProvider } from "./server-proxy";

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

export {
  OllamaProvider,
  GeminiProvider,
  OpenAIProvider,
  GroqProvider,
  WebLLMProvider,
  ServerProxyProvider,
};
export { RateLimitError } from "./server-proxy";
export { withRetry, RetryingProvider } from "./with-retry";
export type { AIProvider, ProviderConfig, ProviderType } from "./types";
