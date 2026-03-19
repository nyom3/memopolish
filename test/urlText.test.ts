import assert from "node:assert/strict";

import { splitTextWithUrls, splitTrailingPunctuation } from "../src/lib/urlText.ts";

const joinSegments = (
  segments: ReturnType<typeof splitTextWithUrls>,
): string => segments.map((segment) => segment.value).join("");

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
  {
    name: "splitTextWithUrls は URL がない文字列をそのまま text segment にする",
    run: () => {
      assert.deepEqual(splitTextWithUrls("URL を含まない通常テキストです"), [
        { type: "text", value: "URL を含まない通常テキストです" },
      ]);
    },
  },
  {
    name: "splitTextWithUrls は文頭 URL を link と後続 text に分割する",
    run: () => {
      assert.deepEqual(splitTextWithUrls("https://example.com/path の確認"), [
        { type: "link", value: "https://example.com/path" },
        { type: "text", value: " の確認" },
      ]);
    },
  },
  {
    name: "splitTextWithUrls は文末 URL を前置 text と link に分割する",
    run: () => {
      assert.deepEqual(splitTextWithUrls("詳細はこちら https://example.com/path"), [
        { type: "text", value: "詳細はこちら " },
        { type: "link", value: "https://example.com/path" },
      ]);
    },
  },
  {
    name: "splitTextWithUrls は複数 URL を順序どおりに分割する",
    run: () => {
      assert.deepEqual(
        splitTextWithUrls("A https://a.example/x?y=1 B https://b.example/z#top。"),
        [
          { type: "text", value: "A " },
          { type: "link", value: "https://a.example/x?y=1" },
          { type: "text", value: " B " },
          { type: "link", value: "https://b.example/z#top" },
          { type: "text", value: "。" },
        ],
      );
    },
  },
  {
    name: "splitTextWithUrls は ASCII 記号を含む URL を link として保持する",
    run: () => {
      assert.deepEqual(
        splitTextWithUrls("確認 https://example.com/a-_.~/?q=1&x=y#frag!"),
        [
          { type: "text", value: "確認 " },
          { type: "link", value: "https://example.com/a-_.~/?q=1&x=y#frag!" },
        ],
      );
    },
  },
  {
    name: "splitTextWithUrls の segment を再連結すると元文字列に戻る",
    run: () => {
      const value = "確認 https://example.com/path。次は https://example.org?q=1#top";

      assert.equal(joinSegments(splitTextWithUrls(value)), value);
    },
  },
];
