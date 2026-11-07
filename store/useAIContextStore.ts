"use client";

import { create } from "zustand";
import type { DocTabMode } from "@/types";

/**
 * The bridge between the Document Viewer and the AI Assistant box.
 * Clicking "pyq ai" (or flash card / quiz) on a loaded PDF doesn't just
 * switch a tab locally — it has to hand the extracted text to a sibling
 * widget and make it act, without the user ever touching the AI box tab.
 * That cross-widget handoff is exactly what a global store is for.
 */
interface AIContextState {
  mode: DocTabMode | null;
  sourceText: string | null;
  sourceName: string | null;
  /** Bumped on every push so the assistant's effect fires even if mode+text repeat. */
  requestId: number;
  pushContext: (mode: DocTabMode, sourceText: string, sourceName: string) => void;
  clear: () => void;
}

export const useAIContextStore = create<AIContextState>((set, get) => ({
  mode: null,
  sourceText: null,
  sourceName: null,
  requestId: 0,

  pushContext: (mode, sourceText, sourceName) =>
    set({ mode, sourceText, sourceName, requestId: get().requestId + 1 }),

  clear: () => set({ mode: null, sourceText: null, sourceName: null }),
}));
