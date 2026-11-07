"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, Settings2, SkipForward, Timer, Volume2, VolumeX } from "lucide-react";
import { WidgetChrome } from "@/components/ui/WidgetChrome";
import { GlassButton } from "@/components/ui/GlassButton";
import { cn, formatClock } from "@/lib/utils";
import { getAudioContext, playButtonPress, playTick, playTing } from "@/lib/audioSynth";

type Mode = "focus" | "short" | "long";

const MODE_LABEL: Record<Mode, string> = { focus: "Focus", short: "Short break", long: "Long break" };
const RADIUS = 82;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Durations {
  focus: number;
  short: number;
  long: number;
}

const DEFAULT_DURATIONS: Durations = { focus: 25, short: 5, long: 15 };

function getTodayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `pomodoro_sessions_${yyyy}-${mm}-${dd}`;
}

export function PomodoroTimer() {
  const [durations, setDurations] = useState<Durations>(DEFAULT_DURATIONS);
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATIONS.focus * 60);
  const [running, setRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const sessionsCompletedRef = useRef(sessionsCompleted);
  sessionsCompletedRef.current = sessionsCompleted;

  // Load persisted sessions for today on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getTodayKey());
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0) {
          setSessionsCompleted(val);
        }
      }
    } catch {}
  }, []);

  const updateSessions = useCallback((countOrUpdater: number | ((prev: number) => number)) => {
    setSessionsCompleted((prev) => {
      const next = typeof countOrUpdater === "function" ? countOrUpdater(prev) : countOrUpdater;
      const valid = Math.max(0, next);
      try {
        localStorage.setItem(getTodayKey(), String(valid));
      } catch {}
      return valid;
    });
  }, []);

  const totalSeconds = durations[mode] * 60;
  const elapsed = totalSeconds - secondsLeft;
  const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;

  const click = useCallback(
    (fn: (ctx: AudioContext) => void) => {
      if (!soundOnRef.current) return;
      const ctx = getAudioContext();
      if (ctx) fn(ctx);
    },
    []
  );

  const switchMode = useCallback(
    (next: Mode, opts?: { auto?: boolean }) => {
      setMode(next);
      setSecondsLeft(durations[next] * 60);
      setRunning(false);
      if (!opts?.auto) click(playButtonPress);
    },
    [durations, click]
  );

  const handleComplete = useCallback(() => {
    click(playTing);
    setRunning(false);
    if (mode === "focus") {
      const nextCount = sessionsCompletedRef.current + 1;
      updateSessions(nextCount);
      switchMode(nextCount % 4 === 0 ? "long" : "short", { auto: true });
    } else {
      switchMode("focus", { auto: true });
    }
  }, [click, mode, switchMode, updateSessions]);

  const handleCompleteRef = useRef(handleComplete);
  handleCompleteRef.current = handleComplete;

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      if (soundOnRef.current) {
        click(playTick);
      }
      setSecondsLeft((s) => {
        if (s <= 1) {
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, click]);

  // When timer hits 0 while running, cleanly complete the session
  useEffect(() => {
    if (running && secondsLeft === 0) {
      handleCompleteRef.current();
    }
  }, [running, secondsLeft]);

  const toggleRun = () => {
    click(playTing);
    setRunning((r) => !r);
  };

  const resetCurrent = () => {
    click(playButtonPress);
    setRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const updateDuration = (key: Mode, minutes: number) => {
    const clamped = Math.max(1, Math.min(180, Math.round(minutes) || 1));
    setDurations((d) => {
      const next = { ...d, [key]: clamped };
      if (key === mode) setSecondsLeft(clamped * 60);
      return next;
    });
  };

  // Analog second-hand: sweeps a full turn every 60 real seconds of elapsed
  // session time, purely for that "apparent of a stopwatch" feel.
  const handAngle = useMemo(() => (elapsed % 60) * 6, [elapsed]);

  // Measure container size dynamically so dial, buttons and typography scale smoothly on resize
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 240, height: 280 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setContainerSize({ width, height });
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  const isTiny = containerSize.height < 215 || containerSize.width < 195;
  const isCompact = containerSize.height < 275 || containerSize.width < 235;

  // Reserved vertical space: mode tabs (~26-32px), button row (~28-42px), padding/gap (~12-20px)
  const reservedHeight = isTiny ? 72 : isCompact ? 86 : 102;
  const reservedWidth = isTiny ? 8 : isCompact ? 12 : 20;

  const maxDialByHeight = Math.max(60, containerSize.height - reservedHeight);
  const maxDialByWidth = Math.max(60, containerSize.width - reservedWidth);
  const dialDiameter = Math.min(220, Math.floor(Math.min(maxDialByHeight, maxDialByWidth)));

  const timeFontSize = Math.max(14, Math.min(32, Math.round(dialDiameter * 0.165)));
  const sessionFontSize = Math.max(8, Math.min(11, Math.round(dialDiameter * 0.058)));

  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <WidgetChrome
      icon={<Timer className="h-4 w-4" />}
      title="Pomodoro"
      subtitle={MODE_LABEL[mode]}
      actions={
        <>
          <button
            type="button"
            title={soundOn ? "Mute timer sounds" : "Unmute timer sounds"}
            aria-label={soundOn ? "Mute timer sounds" : "Unmute timer sounds"}
            onClick={() => setSoundOn((s) => !s)}
            className={cn(
              "rounded-md p-1.5 transition-colors hover:bg-white/10",
              soundOn ? "text-ink-faint hover:text-ink" : "bg-white/10 text-amber-400"
            )}
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button
            aria-label="Timer settings"
            onClick={() => setShowSettings((s) => !s)}
            className={cn(
              "rounded-md p-1.5 text-ink-faint transition-colors hover:bg-white/10 hover:text-ink",
              showSettings && "bg-white/10 text-accent"
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </>
      }
      bodyClassName="overflow-hidden p-2 sm:p-2.5 flex flex-col h-full"
    >
      <div ref={containerRef} className="flex h-full w-full flex-col items-center justify-between overflow-hidden">
        {/* Mode Selector Tabs */}
        <div className="flex shrink-0 gap-1 rounded-full border border-glass-border bg-white/5 p-0.5 sm:p-1">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                "rounded-full font-medium transition-colors",
                isTiny ? "px-1.5 py-0.5 text-[9px]" : isCompact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
                mode === m ? "bg-accent text-[#171009]" : "text-ink-soft hover:text-ink"
              )}
            >
              {isTiny ? (m === "focus" ? "Focus" : m === "short" ? "Short" : "Long") : MODE_LABEL[m]}
            </button>
          ))}
        </div>

        {showSettings ? (
          <div className="my-auto w-full max-h-[85%] space-y-2 overflow-y-auto rounded-lg border border-glass-border bg-white/5 p-2.5 text-xs">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <label key={m} className="flex items-center justify-between gap-2 text-ink-soft">
                {MODE_LABEL[m]}
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={durations[m]}
                  onChange={(e) => updateDuration(m, Number(e.target.value))}
                  className="glass-input w-16 py-0.5 text-right text-xs"
                />
              </label>
            ))}
            <div className="flex items-center justify-between gap-2 border-t border-glass-border pt-2 text-ink-soft">
              <span>Sessions today</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateSessions((s) => Math.max(0, s - 1))}
                  className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-xs font-semibold text-ink transition-colors hover:bg-white/10"
                  title="Decrease session count"
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={sessionsCompleted}
                  onChange={(e) => updateSessions(Math.max(0, Number(e.target.value) || 0))}
                  className="glass-input w-12 py-0.5 text-center text-xs"
                />
                <button
                  type="button"
                  onClick={() => updateSessions((s) => s + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-xs font-semibold text-ink transition-colors hover:bg-white/10"
                  title="Increase session count"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Clock Dial Container (Flex-1 so it takes available space and shrinks on small sizes) */
          <div className="flex flex-1 min-h-0 min-w-0 w-full items-center justify-center py-0.5">
            <div
              className="relative flex shrink-0 items-center justify-center aspect-square"
              style={{
                width: dialDiameter,
                height: dialDiameter,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              {/* Progress track and active ring */}
              <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle
                  cx="100"
                  cy="100"
                  r={RADIUS}
                  fill="none"
                  stroke="#E8A855"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 0.4s linear", filter: "drop-shadow(0 0 6px rgba(232,168,85,0.55))" }}
                />
              </svg>

              {/* Tick marks — 12 major, 48 minor, like a real dial. */}
              <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-0 h-full w-full">
                {Array.from({ length: 60 }).map((_, i) => {
                  const major = i % 5 === 0;
                  const angle = (i / 60) * 360;
                  const outer = 68;
                  const inner = major ? 60 : 64;
                  const rad = (angle * Math.PI) / 180;
                  const x1 = 100 + outer * Math.sin(rad);
                  const y1 = 100 - outer * Math.cos(rad);
                  const x2 = 100 + inner * Math.sin(rad);
                  const y2 = 100 - inner * Math.cos(rad);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={major ? "rgba(243,245,248,0.35)" : "rgba(243,245,248,0.14)"}
                      strokeWidth={major ? 1.6 : 1}
                    />
                  );
                })}
                {/* Sweeping analog second hand */}
                <motion.line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="42"
                  stroke="rgba(232,168,85,0.9)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ transformOrigin: "100px 100px", originX: "100px", originY: "100px" }}
                  animate={{ rotate: handAngle }}
                  transition={{ duration: 0.4, ease: "linear" }}
                />
                <circle cx="100" cy="100" r="4" fill="#E8A855" />
              </svg>

              {/* Center dynamic text scaled with dial diameter */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <span
                  className="font-display font-semibold tabular-nums text-ink leading-none"
                  style={{ fontSize: `${timeFontSize}px` }}
                >
                  {formatClock(secondsLeft)}
                </span>
                <span
                  className="mt-1 whitespace-nowrap text-ink-faint leading-none"
                  style={{ fontSize: `${sessionFontSize}px` }}
                  title={`${sessionsCompleted} completed session(s) today. Click Settings (gear icon) to adjust.`}
                >
                  {sessionsCompleted} session{sessionsCompleted === 1 ? "" : "s"} today
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons Row - shrinks proportionally based on container size */}
        <div className="flex shrink-0 items-center justify-center gap-2 sm:gap-3 py-0.5">
          <button
            type="button"
            aria-label="Reset"
            onClick={resetCurrent}
            className={cn(
              "inline-flex items-center justify-center rounded-lg border border-glass-border bg-white/5 text-ink transition-all hover:border-glass-borderStrong hover:bg-white/10 active:scale-95",
              isTiny ? "h-6 w-6" : isCompact ? "h-7 w-7" : "h-8 w-8"
            )}
          >
            <RotateCcw className={isTiny ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </button>
          <button
            type="button"
            aria-label={running ? "Pause" : "Start"}
            onClick={toggleRun}
            className={cn(
              "inline-flex items-center justify-center rounded-full bg-accent text-[#171009] shadow-glow transition-all hover:brightness-110 active:scale-95",
              isTiny ? "h-7 w-7" : isCompact ? "h-9 w-9" : "h-11 w-11"
            )}
          >
            {running ? (
              <Pause className={isTiny ? "h-3.5 w-3.5" : isCompact ? "h-4 w-4" : "h-5 w-5"} />
            ) : (
              <Play className={cn("ml-0.5", isTiny ? "h-3.5 w-3.5" : isCompact ? "h-4 w-4" : "h-5 w-5")} />
            )}
          </button>
          <button
            type="button"
            aria-label="Skip to next"
            onClick={() => handleCompleteRef.current()}
            className={cn(
              "inline-flex items-center justify-center rounded-lg border border-glass-border bg-white/5 text-ink transition-all hover:border-glass-borderStrong hover:bg-white/10 active:scale-95",
              isTiny ? "h-6 w-6" : isCompact ? "h-7 w-7" : "h-8 w-8"
            )}
          >
            <SkipForward className={isTiny ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </button>
        </div>
      </div>
    </WidgetChrome>
  );
}
