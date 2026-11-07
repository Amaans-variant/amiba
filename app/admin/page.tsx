import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminUserTable } from "@/components/dashboard/AdminUserTable";
import type { Profile } from "@/types";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>
      <h1 className="mb-1 font-display text-xl font-semibold text-ink">User management</h1>
      <p className="mb-6 text-sm text-ink-faint">{allProfiles?.length ?? 0} students registered</p>
      <AdminUserTable initialProfiles={(allProfiles as Profile[]) ?? []} currentUserId={user.id} />
    </div>
  );
}
