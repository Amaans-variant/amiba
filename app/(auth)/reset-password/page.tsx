"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GlassButton } from "@/components/ui/GlassButton";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <GlassPanel strong className="p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold text-ink">Set a new password</h1>
          <p className="text-xs text-ink-faint">Make it something you have not used before</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-ink-soft">New password</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Confirm password</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="glass-input"
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <GlassButton type="submit" variant="primary" disabled={loading} className="w-full justify-center">
          {loading ? "Saving..." : "Update password"}
        </GlassButton>
      </form>
    </GlassPanel>
  );
}
