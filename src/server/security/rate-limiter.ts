export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, number[]>();

/**
 * In-memory sliding-window rate limiter.
 * Default: 10 requests per 60,000ms (1 minute).
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const existingTimestamps = rateLimitStore.get(key) ?? [];
  // Filter out timestamps older than current window
  const activeTimestamps = existingTimestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0] ?? now;
    const resetAt = oldest + windowMs;
    rateLimitStore.set(key, activeTimestamps);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  activeTimestamps.push(now);
  rateLimitStore.set(key, activeTimestamps);

  return {
    allowed: true,
    remaining: limit - activeTimestamps.length,
    resetAt: now + windowMs,
  };
}

/**
 * Resets rate limit store for testing purposes or administrative reset.
 */
export function resetRateLimitStore(key?: string): void {
  if (key) {
    rateLimitStore.delete(key);
  } else {
    rateLimitStore.clear();
  }
}
