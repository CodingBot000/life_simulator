export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

interface BucketState {
  count: number;
  resetAt: number;
}

const bucketStore = new Map<string, BucketState>();

const DEFAULT_LIMIT = Number.parseInt(process.env.LLMOPS_RATE_LIMIT_COUNT ?? "30", 10);
const DEFAULT_WINDOW_MS = Number.parseInt(
  process.env.LLMOPS_RATE_LIMIT_WINDOW_MS ?? `${60_000}`,
  10,
);

export function checkRateLimit(
  key: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const existing = bucketStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs,
    };

    bucketStore.set(key, next);

    return {
      allowed: true,
      remaining: Math.max(0, limit - next.count),
      resetAt: new Date(next.resetAt).toISOString(),
    };
  }

  existing.count += 1;
  bucketStore.set(key, existing);

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: new Date(existing.resetAt).toISOString(),
  };
}
