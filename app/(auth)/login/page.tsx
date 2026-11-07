"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GlassButton } from "@/components/ui/GlassButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
          <LogIn className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold text-ink">Welcome back</h1>
          <p className="text-xs text-ink-faint">Sign in to your dashboard</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input"
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <GlassButton type="submit" variant="primary" disabled={loading} className="w-full justify-center">
          {loading ? "Signing in..." : "Sign in"}
        </GlassButton>
      </form>
      <div className="mt-5 flex items-center justify-between text-xs text-ink-faint">
        <Link href="/forgot-password" className="hover:text-ink-soft">
          Forgot password?
        </Link>
        <Link href="/signup" className="hover:text-ink-soft">
          Create account
        </Link>
      </div>
    </GlassPanel>
  );
}
