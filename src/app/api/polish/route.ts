import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { validateExtraInstruction, validatePhraseText } from "@/lib/phraseValidation";
import {
  checkRateLimit,
  getTrustedClientIp,
  polishRateLimitMaxRequests,
  polishRateLimitWindowMs,
  pruneExpiredRateLimitBuckets,
  type RateLimitBucket,
} from "@/lib/rateLimit";

const geminiApiKey = process.env.GEMINI_API_KEY ?? "";
const polishRateLimitBuckets = new Map<string, RateLimitBucket>();
let polishRateLimitLastPrunedAt = 0;

type PolishMode = "polish" | "keigo" | "keypoints";

type PolishRequestBody = {
  text?: unknown;
  mode?: unknown;
  extraInstruction?: unknown;
};

export async function POST(request: Request) {
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "Gemini APIキーが未設定です。.env.local を確認してください。" },
      { status: 500 }
    );
  }

  try {
    const { text, mode, extraInstruction } =
      (await request.json()) as PolishRequestBody;

    // 入力バリデーション
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "テキストを入力してください。" }, { status: 400 });
    }

    const textValidationError = validatePhraseText(text);
    if (textValidationError) {
      return NextResponse.json(
        { error: textValidationError.replace("フレーズ", "テキスト") },
        { status: 400 }
      );
    }

    const allowedModes: PolishMode[] = ["polish", "keigo", "keypoints"];
    if (!mode || typeof mode !== "string" || !allowedModes.includes(mode as PolishMode)) {
      return NextResponse.json(
        { error: `modeが不正です。利用可能: ${allowedModes.join(", ")}` },
        { status: 400 }
      );
    }

    if (extraInstruction !== undefined && typeof extraInstruction !== "string") {
      return NextResponse.json(
        { error: "追加指示の形式が不正です。" },
        { status: 400 }
      );
    }

    if (typeof extraInstruction === "string") {
      const extraInstructionValidationError = validateExtraInstruction(extraInstruction);
      if (extraInstructionValidationError) {
        return NextResponse.json(
          {
            error: extraInstructionValidationError,
          },
          { status: 400 }
        );
      }
    }

    const now = Date.now();
    if (now - polishRateLimitLastPrunedAt >= polishRateLimitWindowMs) {
      const activeBuckets = pruneExpiredRateLimitBuckets({
        entries: [...polishRateLimitBuckets.entries()],
        now,
        windowMs: polishRateLimitWindowMs,
      });
      polishRateLimitBuckets.clear();
      for (const [ip, bucket] of activeBuckets) {
        polishRateLimitBuckets.set(ip, bucket);
      }
      polishRateLimitLastPrunedAt = now;
    }

    const clientIp = getTrustedClientIp(request.headers);
    if (clientIp) {
      const rateLimitResult = checkRateLimit({
        currentBucket: polishRateLimitBuckets.get(clientIp),
        maxRequests: polishRateLimitMaxRequests,
        now,
        windowMs: polishRateLimitWindowMs,
      });
      polishRateLimitBuckets.set(clientIp, rateLimitResult.bucket);

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "AI加工の利用回数が一時的に上限に達しました。しばらくして再試行してください。" },
          {
            headers: {
              "Retry-After": String(rateLimitResult.retryAfterSeconds),
            },
            status: 429,
          }
        );
      }
    }

    // Gemini モデル初期化
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const selectedMode = mode as PolishMode;

    let modeInstruction = "";
    switch (selectedMode) {
      case "polish":
        modeInstruction =
          "文意は変えず、自然で読みやすい表現に整えてください。冗長さを減らし、簡潔にします。可能なら100〜300文字程度に収めてください。";
        break;
      case "keigo":
        modeInstruction =
          "丁寧で簡潔な敬語に変換してください。必ず2文以上で完結させてください。最後は「以上、よろしくお願いいたします。」で締めてください。創作はせず、事実・固有名詞・数値は変えないでください。可能なら100〜300文字程度に収めてください。";
        break;
      case "keypoints":
        modeInstruction =
          "要点を箇条書きで最大5点にまとめてください。創作はせず、事実・固有名詞・数値は変えないでください。";
        break;
    }

    const extra =
      typeof extraInstruction === "string" && extraInstruction.trim().length > 0
        ? `\n追加指示: ${extraInstruction.trim()}\n`
        : "";

    // 出力ポリシーを明示したプロンプト
    const fullPrompt = `あなたは日本語の文章編集アシスタントです。
必ず守ること:
- 入力にない事実は追加しない
- 固有名詞・数値・日付を勝手に補完/変更しない
- 必要以上に長くしない

タスク: ${modeInstruction}
${extra}入力:
${text}`;

    // 生成処理（続き生成にも流用）
    const generate = async (prompt: string): Promise<string> => {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.3,
        },
      });
      const response = await result.response;
      return response.text();
    };

    let output = await generate(fullPrompt);

    const needsContinuation = (value: string): boolean => {
      const trimmed = value.trim();
      if (!trimmed) {
        return true;
      }
      return !/[。！？]$/.test(trimmed);
    };

    // keigo は締め文で完結させる
    if (selectedMode === "keigo") {
      const closing = "以上、よろしくお願いいたします。";
      if (!output.includes(closing)) {
        const continuationPrompt = `あなたは日本語の文章編集アシスタントです。
必ず守ること:
- 入力にない事実は追加しない
- 固有名詞・数値・日付を勝手に補完/変更しない
- 必ず敬語で完結させる

以下の文の続きを出力してください。全文を繰り返さず「続きだけ」を出力し、最後は「${closing}」で締めてください。

対象の文:
${output}`;
        const continuation = await generate(continuationPrompt);
        output = `${output}${continuation}`;
      }

      if (!output.includes(closing)) {
        output = `${output}\n${closing}`;
      }
    }

    // polish が途中で止まった場合は続きを要求
    if (selectedMode === "polish" && needsContinuation(output)) {
      const continuationPrompt = `あなたは日本語の文章編集アシスタントです。
必ず守ること:
- 入力にない事実は追加しない
- 固有名詞・数値・日付を勝手に補完/変更しない

以下の文の続きを出力してください。全文を繰り返さず「続きだけ」を出力してください。文末は「。」などで完結させてください。

対象の文:
${output}`;
      const continuation = await generate(continuationPrompt);
      output = `${output}${continuation}`;
    }

    if (selectedMode === "polish" && needsContinuation(output)) {
      output = `${output}。`;
    }

    if (selectedMode === "keypoints") {
      const keypointsPrompt = `あなたは日本語の文章編集アシスタントです。
必ず守ること:
- 入力にない事実は追加しない
- 固有名詞・数値・日付を勝手に補完/変更しない
- 入力に含まれないファイル名や機能名は書かない
- 出力は箇条書きのみ（前置きやまとめ文は禁止）

入力から要点を3〜5点で箇条書きにしてください。記号は "-" を使ってください。

入力:
${text}`;
      output = await generate(keypointsPrompt);
    }

    return NextResponse.json({ output });
  } catch (error: unknown) {
    console.error("API error:", error);

    let errorMessage = "サーバーでエラーが発生しました。";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("API key not valid")) {
        errorMessage = "Gemini APIキーが無効です。.env.local を確認してください。";
      } else if (error.message.includes("quota exceeded")) {
        errorMessage = "Gemini APIの上限に達しました。しばらくして再試行してください。";
        statusCode = 429;
      } else if (error.message.includes("safety settings")) {
        errorMessage = "安全ガイドラインにより処理できませんでした。";
        statusCode = 400;
      } else if (error.message.includes("bad request")) {
        errorMessage = "入力内容を確認してください。";
        statusCode = 400;
      } else {
        errorMessage = `Gemini APIエラー: ${error.message}`;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
