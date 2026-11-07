"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { Profile, Role } from "@/types";

export function AdminUserTable({
  initialProfiles,
  currentUserId,
}: {
  initialProfiles: Profile[];
  currentUserId: string;
}) {
  const [profiles, setProfiles] = useState(initialProfiles);

  const changeRole = async (id: string, role: Role) => {
    const previous = profiles;
    setProfiles((p) => p.map((u) => (u.id === id ? { ...u, role } : u)));
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) setProfiles(previous);
  };

  if (profiles.length === 0) {
    return <p className="text-sm text-ink-faint">No students registered yet.</p>;
  }

  return (
    <GlassPanel className="divide-y divide-glass-border overflow-hidden">
      {profiles.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{p.full_name || p.email || p.id}</p>
            <p className="truncate text-[11px] text-ink-faint">{p.email}</p>
          </div>
          <select
            value={p.role}
            disabled={p.id === currentUserId}
            onChange={(e) => changeRole(p.id, e.target.value as Role)}
            title={p.id === currentUserId ? "You cannot change your own role" : undefined}
            className="glass-input w-auto py-1 text-xs disabled:opacity-50"
          >
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      ))}
    </GlassPanel>
  );
}
