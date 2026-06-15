// In-memory rate limiter for the public portal (Ch10).
//
// Next 16's `proxy` runs on the nodejs runtime, so this module-scope state
// persists across requests within a server instance — basic abuse protection,
// NOT a distributed guarantee (each lambda/instance keeps its own counters). The
// `RateLimiter` interface lets a Redis-backed limiter (e.g. Upstash) drop in for
// production without touching callers.

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

type Bucket = { count: number; resetAt: number };

export type RateLimiterOptions = {
  limit?: number;
  windowMs?: number;
  /** Injectable clock — defaults to `Date.now`; tests pass a fake. */
  now?: () => number;
};

/** Fixed-window counter keyed by an arbitrary string (e.g. `${ip}:${token}`). */
export function createInMemoryRateLimiter({
  limit = 30,
  windowMs = 60_000,
  now = () => Date.now(),
}: RateLimiterOptions = {}): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): RateLimitResult {
      const t = now();
      const bucket = buckets.get(key);

      // New window: first hit, or the previous window has elapsed.
      if (!bucket || t >= bucket.resetAt) {
        const resetAt = t + windowMs;
        buckets.set(key, { count: 1, resetAt });
        // Opportunistic prune so the map can't grow unbounded.
        if (buckets.size > 10_000) {
          for (const [k, b] of buckets) if (t >= b.resetAt) buckets.delete(k);
        }
        return { ok: true, remaining: limit - 1, resetAt };
      }

      bucket.count += 1;
      return {
        ok: bucket.count <= limit,
        remaining: Math.max(0, limit - bucket.count),
        resetAt: bucket.resetAt,
      };
    },
  };
}

/** Shared limiter for the portal `proxy` (module-scope state). 30 req / 60 s. */
export const portalRateLimiter = createInMemoryRateLimiter();
