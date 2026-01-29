import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Access your API key as an environment variable (see .env.local)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { text, mode, extraInstruction } = await request.json();

    // Basic validation
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }

    const MAX_INPUT_LENGTH = 5000; // Define maximum input length
    if (text.length > MAX_INPUT_LENGTH) {
      return NextResponse.json({ error: `Input text exceeds the maximum allowed length of ${MAX_INPUT_LENGTH} characters.` }, { status: 400 });
    }

    const allowedModes = ["request_line", "summarize", "bulletize", "tasks"];
    if (!mode || typeof mode !== 'string' || !allowedModes.includes(mode)) {
      return NextResponse.json({ error: `Invalid mode. Allowed modes are: ${allowedModes.join(', ')}` }, { status: 400 });
    }

    // For now, we'll use a simple text-only model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Define mode-specific instructions
    let modeInstruction = "";
    switch (mode) {
      case "request_line":
        modeInstruction = "以下のメモを、丁寧で簡潔な依頼文に清書してください。相手に明確に伝わるように、要点をまとめ、不必要な情報は省いてください。";
        break;
      case "summarize":
        modeInstruction = "以下のメモの要点を抽出し、簡潔に要約してください。重要な情報を見落とさず、全体の内容が把握できるようにまとめてください。";
        break;
      case "bulletize":
        modeInstruction = "以下のメモの内容を、分かりやすい箇条書き形式で整理してください。各項目は簡潔にし、関連する内容はグループ化してください。";
        break;
      case "tasks":
        modeInstruction = "以下のメモから、具体的な行動を伴うTODOタスクを抽出し、リスト形式で出力してください。各タスクは明確で実行可能な内容にしてください。";
        break;
      default:
        modeInstruction = "以下のメモを、読みやすく自然な文章に清書してください。"; // Fallback
    }

    // Construct the full prompt
    let fullPrompt = `あなたはプロの編集者です。以下の指示に従って、ユーザーのメモを清書してください。

# 指示
- 読みやすさを最優先してください。
- 必要に応じて見出しや箇条書きを使用してください。
- 事実の創作は絶対にしないでください。ユーザーのメモにない情報を追加しないでください。
- 不明な点がある場合は、「要確認」と明記してください。

# 清書モード
${modeInstruction}

${extraInstruction ? `# 追加の指示\n${extraInstruction}\n` : ''}

# ユーザーのメモ
${text}
`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const output = response.text();

    return NextResponse.json({ output });
  } catch (error: any) { // Explicitly type error as 'any' for easier inspection
    console.error('API error:', error);
    
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('API key not valid')) {
        errorMessage = 'Gemini API key is not valid. Please check your .env.local file.';
      } else if (error.message.includes('quota exceeded')) {
        errorMessage = 'Gemini API quota exceeded. Please try again later or check your usage limits.';
        statusCode = 429; // Too Many Requests
      } else if (error.message.includes('safety settings')) {
        errorMessage = 'The content violates safety guidelines. Please revise your input.';
        statusCode = 400;
      } else if (error.message.includes('bad request')) {
        errorMessage = 'Bad request to Gemini API. Please check your input.';
        statusCode = 400;
      } else {
        errorMessage = `Gemini API error: ${error.message}`;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
