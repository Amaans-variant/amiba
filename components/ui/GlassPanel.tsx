"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
}

/**
 * The one true frosted-glass surface. Every widget, modal, and card is built
 * on top of this so the blur/border/shadow language stays consistent instead
 * of six slightly-different "glass" cards pretending to be a design system.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, strong, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(strong ? "glass-panel-strong" : "glass-panel", className)}
      {...props}
    >
      {children}
    </div>
  )
);

GlassPanel.displayName = "GlassPanel";
