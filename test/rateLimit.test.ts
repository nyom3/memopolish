import assert from "node:assert/strict";

import {
  checkRateLimit,
  getTrustedClientIp,
  polishRateLimitMaxRequests,
  polishRateLimitWindowMs,
  pruneExpiredRateLimitBuckets,
} from "../src/lib/rateLimit.ts";

export const rateLimitTests: Array<{ name: string; run: () => void }> = [
  {
    name: "checkRateLimit は初回リクエストを許可する",
    run: () => {
      assert.deepEqual(
        checkRateLimit({
          maxRequests: polishRateLimitMaxRequests,
          now: 1000,
          windowMs: polishRateLimitWindowMs,
        }),
        {
          allowed: true,
          bucket: {
            count: 1,
            windowStartedAt: 1000,
          },
        },
      );
    },
  },
  {
    name: "checkRateLimit は上限未満ならカウントを増やして許可する",
    run: () => {
      assert.deepEqual(
        checkRateLimit({
          currentBucket: {
            count: polishRateLimitMaxRequests - 1,
            windowStartedAt: 1000,
          },
          maxRequests: polishRateLimitMaxRequests,
          now: 2000,
          windowMs: polishRateLimitWindowMs,
        }),
        {
          allowed: true,
          bucket: {
            count: polishRateLimitMaxRequests,
            windowStartedAt: 1000,
          },
        },
      );
    },
  },
  {
    name: "checkRateLimit は上限到達時に拒否し retryAfterSeconds を返す",
    run: () => {
      assert.deepEqual(
        checkRateLimit({
          currentBucket: {
            count: polishRateLimitMaxRequests,
            windowStartedAt: 1000,
          },
          maxRequests: polishRateLimitMaxRequests,
          now: 31_000,
          windowMs: polishRateLimitWindowMs,
        }),
        {
          allowed: false,
          bucket: {
            count: polishRateLimitMaxRequests,
            windowStartedAt: 1000,
          },
          retryAfterSeconds: 30,
        },
      );
    },
  },
  {
    name: "checkRateLimit はウィンドウ経過後にカウントをリセットする",
    run: () => {
      assert.deepEqual(
        checkRateLimit({
          currentBucket: {
            count: polishRateLimitMaxRequests,
            windowStartedAt: 1000,
          },
          maxRequests: polishRateLimitMaxRequests,
          now: 1000 + polishRateLimitWindowMs,
          windowMs: polishRateLimitWindowMs,
        }),
        {
          allowed: true,
          bucket: {
            count: 1,
            windowStartedAt: 1000 + polishRateLimitWindowMs,
          },
        },
      );
    },
  },
  {
    name: "getTrustedClientIp は x-vercel-forwarded-for の先頭値を返す",
    run: () => {
      const headers = new Headers({
        "x-vercel-forwarded-for": "203.0.113.1, 198.51.100.2",
        "x-forwarded-for": "203.0.113.1, 198.51.100.2",
        "x-real-ip": "198.51.100.3",
      });

      assert.equal(getTrustedClientIp(headers), "203.0.113.1");
    },
  },
  {
    name: "getTrustedClientIp は x-real-ip へフォールバックし x-forwarded-for を信頼しない",
    run: () => {
      assert.equal(getTrustedClientIp(new Headers({ "x-real-ip": "198.51.100.3" })), "198.51.100.3");
      assert.equal(getTrustedClientIp(new Headers({ "x-forwarded-for": "203.0.113.1" })), undefined);
      assert.equal(getTrustedClientIp(new Headers()), undefined);
    },
  },
  {
    name: "pruneExpiredRateLimitBuckets は期限切れバケットを除外する",
    run: () => {
      assert.deepEqual(
        pruneExpiredRateLimitBuckets({
          entries: [
            ["active", { count: 1, windowStartedAt: 10_000 }],
            ["expired", { count: 1, windowStartedAt: 1_000 }],
          ],
          now: 10_000 + polishRateLimitWindowMs - 1,
          windowMs: polishRateLimitWindowMs,
        }),
        [["active", { count: 1, windowStartedAt: 10_000 }]],
      );
    },
  },
];
