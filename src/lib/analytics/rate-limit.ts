import "server-only";

/**
 * Small in-memory sliding-window limiter. Per serverless instance, which is
 * fine as a first line of defense for likes/reports; the database enforces
 * the real invariants (unique like per visitor, report caps per day).
 */

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastSweep > windowMs * 2) {
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t > windowMs)) buckets.delete(k);
    }
    lastSweep = now;
  }
  const times = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    buckets.set(key, times);
    return false;
  }
  times.push(now);
  buckets.set(key, times);
  return true;
}
