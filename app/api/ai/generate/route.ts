import { NextResponse } from "next/server";
import { callGeminiSingle } from "@/lib/gemini";

const FLASHCARD_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: ["cards"],
};

const QUIZ_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctIndex: { type: "integer" },
          explanation: { type: "string" },
        },
        required: ["question", "options", "correctIndex"],
      },
    },
  },
  required: ["questions"],
};

export async function POST(req: Request) {
  try {
    const { mode, sourceText, sourceName } = await req.json();

    if (!sourceText || typeof sourceText !== "string") {
      return NextResponse.json(
        { error: "No document is loaded yet — open a PDF in the viewer first." },
        { status: 400 }
      );
    }

    // Gemini's context window can take a lot more than this, but a 20k-char
    // slice keeps latency and free-tier token usage sane for a single widget
    // call. Dense AKTU syllabi are usually well within that anyway.
    const trimmed = sourceText.slice(0, 20000);
    const name = typeof sourceName === "string" && sourceName ? sourceName : "the active document";

    if (mode === "flashcards") {
      const prompt = `Create 8 to 12 flashcards from the study material below ("${name}"). Favor definitions, formulas, and concepts a student would need to recall quickly before an exam. Keep each answer to 1-3 sentences.\n\nMaterial:\n${trimmed}`;
      const raw = await callGeminiSingle(prompt, { jsonSchema: FLASHCARD_SCHEMA, temperature: 0.5 });
      return NextResponse.json(JSON.parse(raw));
    }

    if (mode === "quiz") {
      const prompt = `Create a 6-question multiple-choice quiz (4 options each, exactly one correct) from the study material below ("${name}"). Vary the difficulty and cover different sections of the material. Include a one-sentence explanation for each correct answer.\n\nMaterial:\n${trimmed}`;
      const raw = await callGeminiSingle(prompt, { jsonSchema: QUIZ_SCHEMA, temperature: 0.6 });
      return NextResponse.json(JSON.parse(raw));
    }

    if (mode === "pyq") {
      const prompt = `You are analyzing previous-year exam questions (PYQs) from an AKTU (Dr. A.P.J. Abdul Kalam Technical University) subject — this could be Web Technology, DBMS, Machine Learning, or Design & Analysis of Algorithms, or another subject; identify it from the text. Source document: "${name}".

Do the following, with clear Markdown headings:
1. **Subject & likely unit(s)** — name the subject and, where you can tell, which unit/topic each question belongs to.
2. **Grouped questions** — group the previous-year questions by topic, noting any that repeat across years (these are the ones most likely to reappear).
3. **Detailed answers** — for the 5 most important/recurring questions, write a full, exam-ready answer (diagrams described in words where relevant).

Source text:
${trimmed}`;
      const text = await callGeminiSingle(prompt, { temperature: 0.4 });
      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: `Unknown mode "${mode}".` }, { status: 400 });
  } catch (err) {
    console.error("[/api/ai/generate]", err);
    const message = err instanceof Error ? err.message : "Generation failed.";
    // JSON.parse on a malformed model response is the most likely failure
    // besides the network/key errors callGemini already throws with context.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
