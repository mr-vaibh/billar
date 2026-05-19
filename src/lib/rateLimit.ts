// Simple in-memory rate limiter. For production, replace with Redis-backed solution.

interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

const WINDOW_MS = 60_000; // 1 minute

export interface RateLimitOptions {
  key: string;
  limit: number;
}

export function checkRateLimit({ key, limit }: RateLimitOptions): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return { allowed, remaining, resetAt: entry.resetAt };
}

export function rateLimitResponse(resetAt: number) {
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
