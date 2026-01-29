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

    const allowedModes = ["request_line", "summarize", "bulletize", "tasks"];
    if (!mode || typeof mode !== 'string' || !allowedModes.includes(mode)) {
      return NextResponse.json({ error: `Invalid mode. Allowed modes are: ${allowedModes.join(', ')}` }, { status: 400 });
    }

    // For now, we'll use a simple text-only model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Construct the prompt based on mode and extra instruction
    let prompt = `以下のメモを「${mode}」の形式で清書してください。\n\n`;
    if (extraInstruction) {
      prompt += `追加の指示: ${extraInstruction}\n\n`;
    }
    prompt += `メモ:\n${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const output = response.text();

    return NextResponse.json({ output });
  } catch (error) {
    console.error('API error:', error);
    // Check if the error is related to API key or rate limits
    if (error instanceof Error && error.message.includes('API key not valid')) {
      return NextResponse.json({ error: 'Gemini API key is not valid. Please check your .env.local file.' }, { status: 500});
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
