/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach per IP address.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        if (entry.resetAt < now) store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

/**
 * Check if a request is within rate limits.
 * @param name - Unique name for this rate limiter (e.g., 'signup', 'magic-link')
 * @param identifier - Usually IP address or email
 * @param limit - Max requests in window
 * @param windowMs - Window duration in milliseconds
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  name: string,
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const store = getStore(name);
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Get the client IP from a request (handles common proxy headers).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}
