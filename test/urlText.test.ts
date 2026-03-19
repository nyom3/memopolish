import assert from "node:assert/strict";

import { splitTextWithUrls, splitTrailingPunctuation } from "../src/lib/urlText.ts";

export const urlTextTests: Array<{ name: string; run: () => void }> = [
  {
    name: "splitTrailingPunctuation は URL 末尾の日本語句読点を分離する",
    run: () => {
      assert.deepEqual(splitTrailingPunctuation("https://example.com/path。"), {
        url: "https://example.com/path",
        trailing: "。",
      });
    },
  },
  {
    name: "splitTextWithUrls は本文と URL と句読点を順序どおりに分割する",
    run: () => {
      assert.deepEqual(splitTextWithUrls("確認 https://example.com/path。お願いします"), [
        { type: "text", value: "確認 " },
        { type: "link", value: "https://example.com/path" },
        { type: "text", value: "。お願いします" },
      ]);
    },
  },
];
