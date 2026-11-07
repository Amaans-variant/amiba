"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Hourglass } from "lucide-react";
import { WidgetChrome } from "@/components/ui/WidgetChrome";
import { GlassButton } from "@/components/ui/GlassButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { formatMinutes } from "@/lib/utils";

/**
 * Tracks total continuous study time in minutes. Ticks locally every second
 * for a smooth display, and flushes a +1 via an atomic RPC (see
 * increment_study_minutes in supabase/schema.sql) each time a full minute
 * completes — an RPC increment sidesteps the classic stale-closure-in-a-
 * setInterval bug you'd get from reading `profile.study_minutes` and writing
 * it back yourself.
 */
export function DigitalTimer() {
  const { profile, refreshProfile } = useAuth();
  const [running, setRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const baseMinutes = profile?.study_minutes ?? 0;

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSessionSeconds((s) => {
        const next = s + 1;
        if (next % 60 === 0) {
          createClient()
            .rpc("increment_study_minutes", { minutes: 1 })
            .then(() => refreshProfile());
        }
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return (
    <WidgetChrome icon={<Hourglass className="h-4 w-4" />} title="Study time" subtitle="Continuous minutes">
      <div className="flex h-full flex-col items-center justify-center gap-2.5">
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">
          {formatMinutes(baseMinutes + Math.floor(sessionSeconds / 60))}
        </span>
        <GlassButton size="sm" variant={running ? "danger" : "primary"} onClick={() => setRunning((r) => !r)}>
          {running ? (
            <>
              <Pause className="h-3.5 w-3.5" /> Pause
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> Start
            </>
          )}
        </GlassButton>
      </div>
    </WidgetChrome>
  );
}
