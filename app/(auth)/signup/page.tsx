"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { UserPlus, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GlassButton } from "@/components/ui/GlassButton";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <GlassPanel strong className="flex flex-col items-center gap-2 p-6 text-center">
        <MailCheck className="h-6 w-6 text-accent" />
        <h1 className="font-display text-lg font-semibold text-ink">Check your email</h1>
        <p className="text-xs text-ink-faint">
          We sent a confirmation link to <span className="text-ink-soft">{email}</span>. Click it to activate
          your account.
        </p>
        <Link href="/login" className="mt-2 text-xs text-accent hover:underline">
          Back to sign in
        </Link>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel strong className="p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <UserPlus className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold text-ink">Create your account</h1>
          <p className="text-xs text-ink-faint">Start building your study space</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="glass-input"
          />
        </div>
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
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input"
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <GlassButton type="submit" variant="primary" disabled={loading} className="w-full justify-center">
          {loading ? "Creating account..." : "Create account"}
        </GlassButton>
      </form>
      <div className="mt-5 text-center text-xs text-ink-faint">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </div>
    </GlassPanel>
  );
}
