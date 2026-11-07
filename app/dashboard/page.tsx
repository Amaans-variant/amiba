import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { BackgroundPickerButton } from "@/components/dashboard/BackgroundPickerButton";
import type { Profile } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <AuthProvider userId={user.id} email={user.email ?? null} initialProfile={(profile as Profile) ?? null}>
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-glass-border bg-white/5 text-accent">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-ink">Study Dashboard</h1>
              <p className="text-xs text-ink-faint">{profile?.full_name || user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BackgroundPickerButton />
            {profile?.role === "admin" && (
              <Link href="/admin" className="glass-chip transition-colors hover:border-glass-borderStrong hover:text-ink">
                <ShieldCheck className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
            <SignOutButton />
          </div>
        </header>
        <DashboardGrid />
      </div>
    </AuthProvider>
  );
}
