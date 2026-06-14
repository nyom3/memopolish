import assert from "node:assert/strict";

import { buildKeepaliveResponse } from "../src/lib/keepalive.ts";

export const keepaliveTests: Array<{ name: string; run: () => void }> = [
  {
    name: "buildKeepaliveResponse は設定不足時に 503 と ok false を返す",
    run: () => {
      assert.deepEqual(buildKeepaliveResponse({ hasConfig: false }), {
        body: { ok: false },
        status: 503,
      });
    },
  },
  {
    name: "buildKeepaliveResponse は query 成功時に 200 と ok true を返す",
    run: () => {
      assert.deepEqual(buildKeepaliveResponse({ hasConfig: true }), {
        body: { ok: true },
        status: 200,
      });
    },
  },
  {
    name: "buildKeepaliveResponse は query 失敗時に 500 と ok false を返す",
    run: () => {
      assert.deepEqual(
        buildKeepaliveResponse({ hasConfig: true, hasQueryError: true }),
        {
          body: { ok: false },
          status: 500,
        },
      );
    },
  },
];
