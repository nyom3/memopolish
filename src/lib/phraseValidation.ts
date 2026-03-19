import {
  bucketIdMinLength,
  extraInstructionMaxLength,
  phraseMaxLength,
} from "./phraseConstraints.ts";

// PhraseBridge の入力制約で再利用する pure な validation 群。
// route 固有の認可や DB 検証はここに含めない。

export const isValidBucketId = (value: string): boolean => value.length >= bucketIdMinLength;

export const isSha256Hex = (value: string): boolean => /^[0-9a-f]{64}$/i.test(value);

export const validatePhraseText = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "フレーズを入力してください。";
  }

  if (trimmed.length > phraseMaxLength) {
    return `フレーズは${phraseMaxLength}文字以内で入力してください。`;
  }

  return null;
};

export const validateExtraInstruction = (value: string): string | null => {
  if (value.length > extraInstructionMaxLength) {
    return `追加指示は${extraInstructionMaxLength}文字以内で入力してください。`;
  }

  return null;
};
