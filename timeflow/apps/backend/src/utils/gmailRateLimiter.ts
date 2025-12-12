/**
 * Gmail-specific rate limiter to avoid exhausting API quotas.
 * Simple per-user, per-window counter stored in memory.
 */

const WINDOW_MS = Number(process.env.GMAIL_RATE_LIMIT_WINDOW_MS ?? 60_000); // default 1 minute
const MAX_PER_WINDOW = Number(process.env.GMAIL_RATE_LIMIT_PER_MINUTE ?? 30);

type Bucket = { windowStart: number; count: number };
const buckets = new Map<string, Bucket>();

export class GmailRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('Gmail rate limit exceeded');
    this.name = 'GmailRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function assertWithinGmailRateLimit(userId: string, nowMs = Date.now()): void {
  const windowStart = Math.floor(nowMs / WINDOW_MS) * WINDOW_MS;
  const existing = buckets.get(userId);

  if (existing && existing.windowStart === windowStart) {
    if (existing.count >= MAX_PER_WINDOW) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.windowStart + WINDOW_MS - nowMs) / 1000));
      throw new GmailRateLimitError(retryAfterSeconds);
    }

    existing.count += 1;
    buckets.set(userId, existing);
    return;
  }

  buckets.set(userId, { windowStart, count: 1 });
}

// Helper for tests to reset in-memory state.
export function resetGmailRateLimit() {
  buckets.clear();
}
