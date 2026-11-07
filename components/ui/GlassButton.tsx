"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "ghost", size = "md", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variant === "primary" &&
          "bg-accent text-[#171009] shadow-glow hover:brightness-110",
        variant === "ghost" &&
          "border border-glass-border bg-white/5 text-ink hover:bg-white/10 hover:border-glass-borderStrong",
        variant === "danger" &&
          "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

GlassButton.displayName = "GlassButton";
