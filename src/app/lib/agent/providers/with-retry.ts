import type { AIProvider, Message, GenerateOptions } from "./types";
import { RateLimitError } from "./server-proxy";

const MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 5000;

function isRateLimitError(err: unknown): err is RateLimitError {
  return err instanceof RateLimitError ||
    (err instanceof Error &&
      (err.message.includes("429") || err.message.toLowerCase().includes("rate limit")));
}

function getRetryAfterMs(err: unknown): number {
  if (err instanceof RateLimitError) return err.retryAfter * 1000;
  return DEFAULT_RETRY_DELAY_MS;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Dispatch a custom event so UI can show "Rate limited — retrying in Ns…" */
function dispatchRateLimitEvent(retryAfterMs: number): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("agent:rate-limited", {
        detail: { retryAfterMs },
      })
    );
  }
}

/**
 * Wraps any AIProvider with automatic retry on 429 errors.
 * Retries up to MAX_RETRIES times, waiting Retry-After seconds (or 5s default).
 */
export class RetryingProvider implements AIProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isLocal: boolean;
  readonly listModels: AIProvider["listModels"];
  readonly pullModel: AIProvider["pullModel"];

  constructor(private readonly inner: AIProvider) {
    this.id = inner.id;
    this.name = inner.name;
    this.description = inner.description;
    this.isLocal = inner.isLocal;
    this.listModels = inner.listModels?.bind(inner);
    this.pullModel = inner.pullModel?.bind(inner);
  }

  isAvailable(): Promise<boolean> {
    return this.inner.isAvailable();
  }

  async generate(
    messages: Message[],
    options?: GenerateOptions,
    attempt = 0
  ): Promise<string> {
    try {
      return await this.inner.generate(messages, options);
    } catch (err) {
      if (isRateLimitError(err) && attempt < MAX_RETRIES) {
        const waitMs = getRetryAfterMs(err);
        dispatchRateLimitEvent(waitMs);
        await delay(waitMs);
        return this.generate(messages, options, attempt + 1);
      }
      throw err;
    }
  }

  async *generateStream(
    messages: Message[],
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    if (!this.inner.generateStream) {
      // Fallback: yield full response as one chunk
      const full = await this.generate(messages, options);
      yield full;
      return;
    }

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        yield* this.inner.generateStream(messages, options);
        return;
      } catch (err) {
        if (isRateLimitError(err) && attempt < MAX_RETRIES) {
          const waitMs = getRetryAfterMs(err);
          dispatchRateLimitEvent(waitMs);
          await delay(waitMs);
          attempt++;
        } else {
          throw err;
        }
      }
    }
  }

}

/** Convenience: wrap a provider with retry logic */
export function withRetry(provider: AIProvider): RetryingProvider {
  return new RetryingProvider(provider);
}
