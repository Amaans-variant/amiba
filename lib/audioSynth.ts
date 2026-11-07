// Every sound the Pomodoro widget makes is synthesized here with plain
// oscillators + gain envelopes — no .mp3/.wav assets, so nothing to go
// missing after export. If Tony Stark can build an arc reactor from spare
// parts in a cave, we can build a stopwatch tick from a sine wave.

let sharedCtx: AudioContext | null = null;

/** Lazily creates (or resumes) a shared AudioContext. Must be called from a user gesture. */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = new Ctor();
  }
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

/** A short, quiet mechanical tick — the once-a-second heartbeat while a session runs. */
export function playTick(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 1800;
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.035, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.05);
}

/** A soft tactile "thock" for start/pause/reset/skip button presses. */
export function playButtonPress(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  const t = ctx.currentTime;
  osc.frequency.setValueAtTime(230, t);
  osc.frequency.exponentialRampToValueAtTime(130, t + 0.08);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.14, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.12);
}

/** A brighter two-partial "ting" for session start / session complete. */
export function playTing(ctx: AudioContext) {
  const t = ctx.currentTime;
  [
    { freq: 1046.5, peak: 0.16 },
    { freq: 1568.0, peak: 0.08 },
  ].forEach(({ freq, peak }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.9);
  });
}
