"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types";

interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (userId: string, title: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (userId: string) => {
    set({ loading: true });
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    set({ tasks: error || !data ? [] : (data as Task[]), loading: false });
  },

  addTask: async (userId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({ user_id: userId, title: trimmed, completed: false })
      .select()
      .single();

    if (!error && data) {
      set({ tasks: [...get().tasks, data as Task] });
    }
  },

  toggleTask: async (id: string) => {
    const current = get().tasks.find((t) => t.id === id);
    if (!current) return;
    const nextCompleted = !current.completed;

    // Optimistic update first — the "darken on completion" motion should
    // feel instant, not wait on a round trip.
    set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t)) });

    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ completed: nextCompleted }).eq("id", id);

    if (error) {
      // Roll back if the write actually failed.
      set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, completed: current.completed } : t)) });
    }
  },

  removeTask: async (id: string) => {
    const previous = get().tasks;
    set({ tasks: previous.filter((t) => t.id !== id) });
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) set({ tasks: previous });
  },
}));
