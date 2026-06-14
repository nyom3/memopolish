export type RateLimitBucket = {
  count: number;
  windowStartedAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  bucket: RateLimitBucket;
  retryAfterSeconds?: number;
};

export const polishRateLimitMaxRequests = 10;
export const polishRateLimitWindowMs = 60 * 1000;

function firstHeaderValue(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

export function getTrustedClientIp(headers: Headers): string | undefined {
  return (
    firstHeaderValue(headers.get("x-vercel-forwarded-for")) ??
    firstHeaderValue(headers.get("x-real-ip"))
  );
}

export function pruneExpiredRateLimitBuckets(params: {
  entries: Array<[string, RateLimitBucket]>;
  now: number;
  windowMs: number;
}): Array<[string, RateLimitBucket]> {
  const { entries, now, windowMs } = params;
  return entries.filter(([, bucket]) => now - bucket.windowStartedAt < windowMs);
}

export function checkRateLimit(params: {
  currentBucket?: RateLimitBucket;
  maxRequests: number;
  now: number;
  windowMs: number;
}): RateLimitResult {
  const { currentBucket, maxRequests, now, windowMs } = params;

  if (!currentBucket || now - currentBucket.windowStartedAt >= windowMs) {
    return {
      allowed: true,
      bucket: {
        count: 1,
        windowStartedAt: now,
      },
    };
  }

  if (currentBucket.count >= maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((currentBucket.windowStartedAt + windowMs - now) / 1000),
    );

    return {
      allowed: false,
      bucket: currentBucket,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    bucket: {
      count: currentBucket.count + 1,
      windowStartedAt: currentBucket.windowStartedAt,
    },
  };
}
