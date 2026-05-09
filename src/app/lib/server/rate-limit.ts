/**
 * In-memory LRU rate limiter. Edge-compatible (no Node.js APIs).
 *
 * Keeps the last `maxEntries` IP buckets. Each bucket tracks call counts
 * within a sliding `windowMs` window.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

export interface RateLimiterOptions {
  /** Maximum allowed calls per window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Maximum number of IPs to track (oldest evicted first). */
  maxEntries?: number;
}

export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;
  private readonly map = new Map<string, Bucket>();

  constructor({ limit, windowMs, maxEntries = 2048 }: RateLimiterOptions) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
  }

  /**
   * Checks whether `key` (typically an IP) is within the rate limit.
   * @returns `true` if the request is allowed; `false` if it should be rejected.
   */
  check(key: string): boolean {
    const now = Date.now();
    const existing = this.map.get(key);

    if (!existing || now - existing.windowStart >= this.windowMs) {
      // Evict oldest entry if at capacity
      if (!existing && this.map.size >= this.maxEntries) {
        const oldestKey = this.map.keys().next().value;
        if (oldestKey !== undefined) this.map.delete(oldestKey);
      }
      this.map.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (existing.count >= this.limit) return false;

    existing.count += 1;
    // Move to end so LRU eviction targets truly old entries
    this.map.delete(key);
    this.map.set(key, existing);
    return true;
  }
}

/** 10 callback attempts per hour per IP */
export const authCallbackLimiter = new RateLimiter({
  limit: 10,
  windowMs: 60 * 60 * 1000,
});

/** 60 auth-status checks per minute per IP */
export const meCheckLimiter = new RateLimiter({
  limit: 60,
  windowMs: 60 * 1000,
});

/** Extracts a best-effort IP from a Next.js `Request`. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
