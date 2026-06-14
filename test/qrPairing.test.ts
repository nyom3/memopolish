import assert from "node:assert/strict";

import { bucketIdMinLength, writeKeyLength } from "../src/lib/phraseConstraints.ts";
import { buildQrUrl, parseQrParams } from "../src/lib/qrPairing.ts";

const validBucketId = "b".repeat(bucketIdMinLength);
const validWriteKey = "w".repeat(writeKeyLength);

export const qrPairingTests: Array<{ name: string; run: () => void }> = [
  {
    name: "buildQrUrl は QR 用 URL フォーマットを返す",
    run: () => {
      assert.equal(
        buildQrUrl({
          bucketId: validBucketId,
          writeKey: validWriteKey,
          baseUrl: "https://example.com",
        }),
        `https://example.com/?bucket=${validBucketId}&wk=${validWriteKey}`,
      );
    },
  },
  {
    name: "parseQrParams は有効なクエリをパースする",
    run: () => {
      assert.deepEqual(parseQrParams(`?bucket=${validBucketId}&wk=${validWriteKey}`), {
        bucketId: validBucketId,
        writeKey: validWriteKey,
      });
    },
  },
  {
    name: "parseQrParams は不正な bucketId を undefined にする",
    run: () => {
      assert.deepEqual(
        parseQrParams(`?bucket=${"b".repeat(bucketIdMinLength - 1)}&wk=${validWriteKey}`),
        {
          bucketId: undefined,
          writeKey: validWriteKey,
        },
      );
    },
  },
  {
    name: "parseQrParams は不正な writeKey を undefined にする",
    run: () => {
      assert.deepEqual(parseQrParams(`?bucket=${validBucketId}&wk=${"w".repeat(writeKeyLength - 1)}`), {
        bucketId: validBucketId,
        writeKey: undefined,
      });
    },
  },
  {
    name: "parseQrParams は空文字列でも壊れない",
    run: () => {
      assert.deepEqual(parseQrParams(""), {
        bucketId: undefined,
        writeKey: undefined,
      });
    },
  },
];
