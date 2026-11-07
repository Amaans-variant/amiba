"use client";

import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetChromeProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  noPadding?: boolean;
}

/**
 * Every widget shares this header so the dashboard reads as one system, not
 * seven different boxes. The header doubles as the react-grid-layout drag
 * handle (".widget-drag-handle") — everything below it stays fully
 * interactive (checkboxes, inputs, buttons) without fighting the drag layer.
 */
export function WidgetChrome({
  icon,
  title,
  subtitle,
  actions,
  children,
  bodyClassName,
  noPadding,
}: WidgetChromeProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="widget-drag-handle flex cursor-grab items-center justify-between gap-2 border-b border-glass-border px-4 py-3 active:cursor-grabbing">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-glass-border bg-white/5 text-accent">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-ink">{title}</h2>
            {subtitle && <p className="truncate text-[11px] text-ink-faint">{subtitle}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          <GripVertical className="ml-1 h-4 w-4 text-ink-faint/60" aria-hidden />
        </div>
      </div>
      <div className={cn("min-h-0 flex-1 overflow-y-auto", !noPadding && "p-4", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
