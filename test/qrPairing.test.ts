import assert from "node:assert/strict";

import { bucketIdMinLength, writeKeyLength } from "../src/lib/phraseConstraints.ts";
import {
  buildQrUrl,
  hasQrParams,
  parseQrParams,
  removeQrParams,
} from "../src/lib/qrPairing.ts";

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
    name: "parseQrParams は最小文字数を超える writeKey も有効にする",
    run: () => {
      const longWriteKey = "w".repeat(writeKeyLength + 1);

      assert.deepEqual(parseQrParams(`?bucket=${validBucketId}&wk=${longWriteKey}`), {
        bucketId: validBucketId,
        writeKey: longWriteKey,
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
  {
    name: "hasQrParams は bucket または wk の存在を判定する",
    run: () => {
      assert.equal(hasQrParams("?bucket=value"), true);
      assert.equal(hasQrParams("?wk=value"), true);
      assert.equal(hasQrParams("?utm_source=email"), false);
    },
  },
  {
    name: "removeQrParams は QR パラメータだけを除去する",
    run: () => {
      assert.equal(
        removeQrParams(`?bucket=${validBucketId}&utm_source=email&wk=${validWriteKey}&debug=1`),
        "?utm_source=email&debug=1",
      );
      assert.equal(removeQrParams(`?bucket=${validBucketId}&wk=${validWriteKey}`), "");
    },
  },
];
