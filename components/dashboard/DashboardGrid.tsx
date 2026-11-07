"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import GridLayout, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Check,
  CheckSquare,
  FileText,
  Hourglass,
  LayoutGrid,
  Music2,
  Plus,
  RotateCcw,
  Sparkles,
  Timer,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLayoutStore } from "@/store/useLayoutStore";
import { PomodoroTimer } from "@/components/widgets/PomodoroTimer";
import { TodoList } from "@/components/widgets/TodoList";
import { AIAssistant } from "@/components/widgets/AIAssistant";
import { DocumentViewer } from "@/components/widgets/DocumentViewer";
import { StudyCallRoom } from "@/components/widgets/StudyCallRoom";
import { DigitalTimer } from "@/components/widgets/DigitalTimer";
import { MusicWidget } from "@/components/widgets/MusicWidget";
import { cn } from "@/lib/utils";
import type { LayoutItem } from "@/types";

// Pinned to react-grid-layout v1.x (see package.json) on purpose — v2 shipped
// a rewritten, differently-shaped API. WidthProvider auto-measures the
// container so the grid re-flows on resize without any manual listener code.
const GridLayoutWidth = WidthProvider(GridLayout);

const WIDGETS: Record<string, ComponentType> = {
  pomodoro: PomodoroTimer,
  todo: TodoList,
  ai: AIAssistant,
  docs: DocumentViewer,
  call: StudyCallRoom,
  "digital-timer": DigitalTimer,
  music: MusicWidget,
};

interface WidgetCatalogItem {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
}

const WIDGET_CATALOG: WidgetCatalogItem[] = [
  { id: "pomodoro", title: "Pomodoro Timer", subtitle: "Analog focus & break dial", icon: Timer },
  { id: "todo", title: "To-Do List", subtitle: "Task tracking & checklist", icon: CheckSquare },
  { id: "ai", title: "AI Assistant", subtitle: "Interactive study copilot", icon: Sparkles },
  { id: "docs", title: "Document Viewer", subtitle: "PDF & file notes viewer", icon: FileText },
  { id: "call", title: "Study Call Room", subtitle: "Live peer study & chat", icon: Video },
  { id: "digital-timer", title: "Study Time", subtitle: "Continuous minutes counter", icon: Hourglass },
  { id: "music", title: "Music Player", subtitle: "Lo-Fi & study tracks", icon: Music2 },
];

interface ContextMenuState {
  x: number;
  y: number;
  widgetId: string;
}

export function DashboardGrid() {
  const { userId } = useAuth();
  const { layout, hydrated, hydrate, setLayout, removeWidget, addWidget, persist, resetLayout } = useLayoutStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    hydrate(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Close context menu & add menu when clicking outside or pressing Escape
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setShowAddMenu(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Dragging/resizing fires onLayoutChange on every pixel of movement —
  // writing to Supabase that often would be its own denial-of-service
  // attack, so we debounce the actual persistence.
  const onLayoutChange = useCallback(
    (next: LayoutItem[]) => {
      setLayout(next);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => persist(userId), 800);
    },
    [setLayout, persist, userId]
  );

  const handleReset = () => {
    resetLayout();
    persist(userId);
  };

  const handleContextMenu = (e: React.MouseEvent, widgetId: string) => {
    // Allow standard browser context menu inside text inputs/textareas
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("input") ||
        target.closest("textarea"))
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 200;
    const menuHeight = 110;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

    setContextMenu({ x, y, widgetId });
  };

  const handleDeleteWidget = (widgetId: string) => {
    removeWidget(widgetId);
    persist(userId);
    setContextMenu(null);
  };

  const handleAddWidget = (widgetId: string) => {
    addWidget(widgetId);
    persist(userId);
  };

  const missingWidgetsCount = WIDGET_CATALOG.filter((w) => !layout.some((item) => item.i === w.id)).length;

  if (!hydrated) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-ink-faint">
        Loading your dashboard...
      </div>
    );
  }

  const activeWidgetMeta = contextMenu ? WIDGET_CATALOG.find((w) => w.id === contextMenu.widgetId) : null;

  return (
    <div>
      {/* Top Toolbar: Add Widget on Top Left, Reset Layout on Top Right */}
      <div className="mb-4 flex items-center justify-between gap-3">
        {/* TOP LEFT: Add Widget Button & Popover */}
        <div className="relative" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setShowAddMenu((open) => !open)}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-glass-border bg-white/5 px-3 py-1.5 text-xs font-medium text-ink transition-all hover:border-accent/40 hover:bg-white/10 active:scale-95",
              showAddMenu && "border-accent/60 bg-white/10 text-accent shadow-sm"
            )}
            title="Add widgets to dashboard"
          >
            <Plus className="h-3.5 w-3.5 text-accent" />
            <span>Add Widget</span>
            {missingWidgetsCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent/20 px-1 text-[10px] font-semibold text-accent">
                {missingWidgetsCount}
              </span>
            )}
          </button>

          {showAddMenu && (
            <div className="absolute left-0 top-full z-50 mt-2 w-72 origin-top-left rounded-xl border border-glass-border bg-[#141620]/95 p-2 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <div>
                  <h3 className="text-xs font-semibold text-ink">Add Widgets</h3>
                  <p className="text-[10px] text-ink-faint">Click to place on dashboard</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMenu(false)}
                  className="rounded-md p-1 text-ink-faint transition-colors hover:bg-white/10 hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="my-1.5 h-px bg-white/10" />

              <div className="max-h-[340px] space-y-1 overflow-y-auto pr-1">
                {WIDGET_CATALOG.map((item) => {
                  const Icon = item.icon;
                  const isAdded = layout.some((l) => l.i === item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between gap-2.5 rounded-lg p-2 transition-all",
                        isAdded ? "bg-white/[0.02] opacity-60" : "bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-glass-border bg-white/5 text-accent">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-ink">{item.title}</p>
                          <p className="truncate text-[10px] text-ink-faint">{item.subtitle}</p>
                        </div>
                      </div>

                      {isAdded ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-emerald-400/80">
                          <Check className="h-3 w-3" /> Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddWidget(item.id)}
                          className="flex shrink-0 items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-[#171009] shadow-sm transition-all hover:brightness-110 active:scale-95"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {missingWidgetsCount === 0 && (
                <div className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-center text-[11px] text-emerald-400">
                  All widgets are active on your dashboard!
                </div>
              )}
            </div>
          )}
        </div>

        {/* TOP RIGHT: Reset Layout */}
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-ink-faint transition-colors hover:bg-white/5 hover:text-ink-soft"
          title="Restore default 7-widget layout"
        >
          <RotateCcw className="h-3 w-3" /> Reset layout
        </button>
      </div>

      {/* Grid Layout or Empty State */}
      {layout.length === 0 ? (
        <div className="my-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-glass-border bg-white/5 p-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-glass-border bg-white/5 text-accent">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h3 className="font-display text-base font-semibold text-ink">Dashboard is empty</h3>
          <p className="mb-5 mt-1 max-w-sm text-xs text-ink-faint">
            You have deleted all widgets. Click the &ldquo;Add Widget&rdquo; button on the top left or reset your layout to restore them.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddMenu(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-[#171009] shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> Add Widget
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-glass-border bg-white/5 px-3.5 py-2 text-xs font-medium text-ink transition-all hover:bg-white/10 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore Default
            </button>
          </div>
        </div>
      ) : (
        <GridLayoutWidth
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={24}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          draggableHandle=".widget-drag-handle"
          draggableCancel=".cancel-drag, button, input, textarea"
          onLayoutChange={onLayoutChange}
        >
          {layout.map((item) => {
            const Widget = WIDGETS[item.i];
            return (
              <div
                key={item.i}
                className="glass-panel overflow-hidden transition-shadow"
                onContextMenu={(e) => handleContextMenu(e, item.i)}
              >
                {Widget ? <Widget /> : null}
              </div>
            );
          })}
        </GridLayoutWidth>
      )}

      {/* Floating Right-Click Context Menu */}
      {contextMenu && activeWidgetMeta && (
        <div
          ref={contextMenuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[200px] select-none rounded-xl border border-glass-border bg-[#141620]/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-2.5 py-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-glass-border bg-white/5 text-accent">
              <activeWidgetMeta.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink">{activeWidgetMeta.title}</p>
              <p className="truncate text-[10px] text-ink-faint">Right-click menu</p>
            </div>
          </div>

          <div className="my-1 h-px bg-white/10" />

          {/* Delete Option */}
          <button
            type="button"
            onClick={() => handleDeleteWidget(contextMenu.widgetId)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete widget</span>
          </button>
        </div>
      )}
    </div>
  );
}
