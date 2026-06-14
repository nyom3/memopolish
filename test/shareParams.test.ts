import assert from "node:assert/strict";

import { formatSharedText, parseShareParams } from "../src/lib/shareParams.ts";

export const shareParamsTests: Array<{ name: string; run: () => void }> = [
  {
    name: "parseShareParams は title/text/url を入力欄用テキストへ整形する",
    run: () => {
      assert.deepEqual(
        parseShareParams(
          "?title=%E8%A6%8B%E5%87%BA%E3%81%97&text=%E6%9C%AC%E6%96%87&url=https%3A%2F%2Fexample.com",
        ),
        {
          title: "見出し",
          text: "本文",
          url: "https://example.com",
          sharedText: "見出し\n\n本文\n\nhttps://example.com",
        },
      );
    },
  },
  {
    name: "formatSharedText は text に含まれる url を重複追加しない",
    run: () => {
      assert.equal(
        formatSharedText({
          text: "詳細 https://example.com を確認",
          url: "https://example.com",
        }),
        "詳細 https://example.com を確認",
      );
    },
  },
  {
    name: "formatSharedText は title と text が同じ場合に重複しない",
    run: () => {
      assert.equal(formatSharedText({ title: "同じ本文", text: "同じ本文" }), "同じ本文");
    },
  },
  {
    name: "parseShareParams は空文字列でも壊れない",
    run: () => {
      assert.deepEqual(parseShareParams(""), {
        title: undefined,
        text: undefined,
        url: undefined,
        sharedText: "",
      });
    },
  },
  {
    name: "parseShareParams は空白だけの値を捨てる",
    run: () => {
      assert.deepEqual(parseShareParams("?title=%20%20&text=%0A&url=https%3A%2F%2Fexample.com"), {
        title: undefined,
        text: undefined,
        url: "https://example.com",
        sharedText: "https://example.com",
      });
    },
  },
];
