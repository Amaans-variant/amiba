"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

interface AuthContextValue {
  userId: string;
  email: string | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  userId,
  email,
  initialProfile,
  children,
}: {
  userId: string;
  email: string | null;
  initialProfile: Profile | null;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);

  const refreshProfile = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data as Profile);
  };

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  return (
    <AuthContext.Provider value={{ userId, email, profile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
