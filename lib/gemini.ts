// Server-only. Never import this from a Client Component — it reads the raw
// API key, and the whole point of the /api/ai/* routes is to keep that key
// off the client. If you ever see GEMINI_API_KEY in devtools, something
// went very wrong (and very Ultron-vs-Jarvis).

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

interface CallOptions {
  systemInstruction?: string;
  /** Pass a JSON schema to force structured output (used for flashcards/quiz). */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
}

/**
 * Low-level call: full multi-turn `contents` array in, raw text out.
 * This hits the classic `generateContent` endpoint — still fully supported
 * even as Google pushes newer APIs, and its shape is well documented, which
 * matters a lot when nobody's around to run `npm run dev` and catch a typo.
 */
export async function callGemini(contents: GeminiTurn[], options: CallOptions = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local (get a free key at https://aistudio.google.com/apikey)."
    );
  }

  const body: Record<string, unknown> = { contents };

  if (options.systemInstruction) {
    body.system_instruction = { parts: [{ text: options.systemInstruction }] };
  }

  body.generationConfig = {
    temperature: options.temperature ?? 0.7,
    ...(options.jsonSchema
      ? { responseMimeType: "application/json", responseSchema: options.jsonSchema }
      : {}),
  };

  const res = await fetch(`${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: { text?: string }) => p.text ?? "").join("");

  if (!text) {
    // Usually means the response was blocked by a safety filter, or the
    // model returned an empty candidate — either way, surface *something*
    // useful instead of a silent blank bubble in the chat.
    const finishReason = data?.candidates?.[0]?.finishReason;
    throw new Error(`Gemini returned no text (finishReason: ${finishReason ?? "unknown"}).`);
  }

  return text;
}

/** One-shot convenience wrapper for single-prompt calls (flashcards, quiz, PYQ analysis). */
export async function callGeminiSingle(prompt: string, options: CallOptions = {}) {
  return callGemini([{ role: "user", parts: [{ text: prompt }] }], options);
}
