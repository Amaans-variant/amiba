import { NextResponse } from "next/server";
import { callGemini, type GeminiTurn } from "@/lib/gemini";
import type { AIChatTurn } from "@/types";

const BASE_SYSTEM_PROMPT = `You are the built-in AI assistant inside a student's personal study dashboard.
Be concise, accurate, and helpful. When the user's message includes study material
(a PDF's extracted text, previous-year questions, syllabus content), ground your
answer in that material first before adding outside knowledge. Use Markdown for
structure (headings, bullet points, bold) when it helps readability, especially
for step-by-step explanations or exam-style answers.`;

export async function POST(req: Request) {
  try {
    const { turns, context }: { turns: AIChatTurn[]; context?: string | null } =
      await req.json();

    if (!Array.isArray(turns) || turns.length === 0) {
      return NextResponse.json({ error: "No message provided." }, { status: 400 });
    }

    const contents: GeminiTurn[] = turns.map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    }));

    const systemInstruction = context
      ? `${BASE_SYSTEM_PROMPT}\n\n--- Active document context ---\n${context.slice(0, 24000)}`
      : BASE_SYSTEM_PROMPT;

    const text = await callGemini(contents, { systemInstruction });

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[/api/ai/chat]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong talking to Gemini." },
      { status: 500 }
    );
  }
}
