// TODO: Replace this per-instance Map with a shared store (Upstash Redis / Vercel KV).
// Each serverless instance keeps its own buckets, so limits are approximate across instances.
interface Bucket {
  tokens: number;
  updatedAt: number;
}
const buckets = new Map<string, Bucket>();
const FIVE_MINUTES = 5 * 60_000;

export const LIMITS = {
  chatClient: { capacity: 20, windowMs: FIVE_MINUTES },
  chatIp: { capacity: 60, windowMs: FIVE_MINUTES },
  apiClient: { capacity: 300, windowMs: FIVE_MINUTES },
} as const;

export function take(key: string, { capacity, windowMs }: { capacity: number; windowMs: number }) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  bucket.tokens = Math.min(capacity, bucket.tokens + ((now - bucket.updatedAt) * capacity) / windowMs);
  bucket.updatedAt = now;
  const allowed = bucket.tokens >= 1;
  if (allowed) bucket.tokens -= 1;
  buckets.set(key, bucket);
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (now - b.updatedAt > windowMs) buckets.delete(k);
  }
  return allowed;
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
