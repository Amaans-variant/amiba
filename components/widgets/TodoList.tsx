"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Plus, Square, X } from "lucide-react";
import { WidgetChrome } from "@/components/ui/WidgetChrome";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTaskStore } from "@/store/useTaskStore";
import { cn } from "@/lib/utils";

export function TodoList() {
  const { userId } = useAuth();
  const { tasks, fetchTasks, addTask, toggleTask, removeTask } = useTaskStore();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    fetchTasks(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addTask(userId, draft);
    setDraft("");
  };

  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <WidgetChrome
      icon={<CheckSquare className="h-4 w-4" />}
      title="To-do"
      subtitle={`${remaining} remaining`}
      noPadding
    >
      <div className="flex h-full flex-col">
        <form onSubmit={submit} className="flex gap-2 border-b border-glass-border p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a task..."
            className="glass-input"
          />
          <button
            type="submit"
            aria-label="Add task"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-glass-border bg-white/5 text-ink-soft transition-colors hover:border-accent/50 hover:text-accent"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>

        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {tasks.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-ink-faint">
              Nothing here yet — add your first task above.
            </p>
          )}
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04]"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                  className="shrink-0 text-ink-soft transition-colors hover:text-accent"
                >
                  {task.completed ? (
                    <CheckSquare className="h-[18px] w-[18px] text-accent/80" />
                  ) : (
                    <Square className="h-[18px] w-[18px]" />
                  )}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm transition-colors duration-500",
                    task.completed ? "text-ink-faint/70 line-through" : "text-ink"
                  )}
                >
                  {task.title}
                </span>
                <button
                  onClick={() => removeTask(task.id)}
                  aria-label="Delete task"
                  className="shrink-0 text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </WidgetChrome>
  );
}
