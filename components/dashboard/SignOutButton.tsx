"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button onClick={signOut} className="glass-chip transition-colors hover:border-glass-borderStrong hover:text-ink">
      <LogOut className="h-3.5 w-3.5" /> Sign out
    </button>
  );
}
