"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { LayoutItem } from "@/types";

export const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: "pomodoro", x: 0, y: 0, w: 3, h: 9, minW: 2, minH: 5 },
  { i: "todo", x: 0, y: 9, w: 3, h: 8, minW: 2, minH: 5 },
  { i: "ai", x: 3, y: 0, w: 5, h: 17, minW: 3, minH: 8 },
  { i: "docs", x: 8, y: 0, w: 4, h: 11, minW: 3, minH: 6 },
  { i: "call", x: 8, y: 11, w: 2, h: 6, minW: 2, minH: 4 },
  { i: "digital-timer", x: 10, y: 11, w: 2, h: 4, minW: 2, minH: 3 },
  { i: "music", x: 10, y: 15, w: 2, h: 4, minW: 2, minH: 3 },
];

interface LayoutState {
  layout: LayoutItem[];
  hydrated: boolean;
  saving: boolean;
  hydrate: (userId: string) => Promise<void>;
  setLayout: (layout: LayoutItem[]) => void;
  removeWidget: (id: string) => void;
  addWidget: (id: string) => void;
  persist: (userId: string) => Promise<void>;
  resetLayout: () => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  layout: DEFAULT_LAYOUT,
  hydrated: false,
  saving: false,

  hydrate: async (userId: string) => {
    if (get().hydrated) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("grid_layouts")
      .select("layout")
      .eq("user_id", userId)
      .maybeSingle();

    const saved = data?.layout as LayoutItem[] | undefined;
    set({
      layout: saved && Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_LAYOUT,
      hydrated: true,
    });
  },

  // Local, synchronous — call persist() separately (debounced) to write to Supabase.
  setLayout: (layout: LayoutItem[]) => set({ layout }),

  removeWidget: (id: string) => {
    set((state) => ({
      layout: state.layout.filter((item) => item.i !== id),
    }));
  },

  addWidget: (id: string) => {
    set((state) => {
      if (state.layout.some((item) => item.i === id)) return state;
      const defaultSpec = DEFAULT_LAYOUT.find((item) => item.i === id);
      if (!defaultSpec) return state;

      // Find the lowest row to place the widget
      const maxY = state.layout.reduce((acc, curr) => Math.max(acc, curr.y + curr.h), 0);
      return {
        layout: [...state.layout, { ...defaultSpec, x: 0, y: maxY }],
      };
    });
  },

  persist: async (userId: string) => {
    set({ saving: true });
    const supabase = createClient();
    await supabase.from("grid_layouts").upsert({
      user_id: userId,
      layout: get().layout,
      updated_at: new Date().toISOString(),
    });
    set({ saving: false });
  },

  resetLayout: () => set({ layout: DEFAULT_LAYOUT }),
}));
