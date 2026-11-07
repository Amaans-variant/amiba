import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="mb-6 flex items-center gap-2 text-ink-soft">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-glass-border bg-white/5 text-accent">
          <GraduationCap className="h-4 w-4" />
        </div>
        <span className="font-display text-sm font-medium">Study Dashboard</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
