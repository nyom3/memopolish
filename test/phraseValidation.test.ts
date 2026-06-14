import assert from "node:assert/strict";

import {
  bucketIdMinLength,
  extraInstructionMaxLength,
  phraseMaxLength,
  writeKeyLength,
} from "../src/lib/phraseConstraints.ts";
import {
  isSha256Hex,
  isValidBucketId,
  isValidWriteKey,
  validateExtraInstruction,
  validatePhraseText,
} from "../src/lib/phraseValidation.ts";

export const phraseValidationTests: Array<{ name: string; run: () => void }> = [
  {
    name: "isValidBucketId は最小文字数以上で true を返す",
    run: () => {
      assert.equal(isValidBucketId("a".repeat(bucketIdMinLength - 1)), false);
      assert.equal(isValidBucketId("a".repeat(bucketIdMinLength)), true);
    },
  },
  {
    name: "isSha256Hex は 64 文字の16進文字列だけを許可する",
    run: () => {
      assert.equal(isSha256Hex("a".repeat(64)), true);
      assert.equal(isSha256Hex("g".repeat(64)), false);
      assert.equal(isSha256Hex("a".repeat(63)), false);
    },
  },
  {
    name: "isValidWriteKey は最小文字数以上で true を返す",
    run: () => {
      assert.equal(isValidWriteKey("w".repeat(writeKeyLength - 1)), false);
      assert.equal(isValidWriteKey("w".repeat(writeKeyLength)), true);
      assert.equal(isValidWriteKey("w".repeat(writeKeyLength + 1)), true);
    },
  },
  {
    name: "validatePhraseText は空文字と上限超過を弾く",
    run: () => {
      assert.equal(validatePhraseText("   "), "フレーズを入力してください。");
      assert.equal(
        validatePhraseText("a".repeat(phraseMaxLength + 1)),
        `フレーズは${phraseMaxLength}文字以内で入力してください。`,
      );
      assert.equal(validatePhraseText("ok"), null);
    },
  },
  {
    name: "validateExtraInstruction は上限超過のみ弾く",
    run: () => {
      assert.equal(validateExtraInstruction("a".repeat(extraInstructionMaxLength)), null);
      assert.equal(
        validateExtraInstruction("a".repeat(extraInstructionMaxLength + 1)),
        `追加指示は${extraInstructionMaxLength}文字以内で入力してください。`,
      );
    },
  },
];
