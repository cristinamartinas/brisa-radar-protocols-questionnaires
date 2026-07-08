/**
 * Zero-asset sound effects, synthesized live with the Web Audio API.
 *
 * No audio files ship — every cue is a few oscillators with short gain
 * envelopes, so the whole SFX layer costs nothing to download and stays in the
 * game's "cheap but juicy" spirit. Client-only; all calls are no-ops on the
 * server or when the player has muted (persisted in localStorage).
 */

type Tier = "click" | "small" | "big" | "epic" | "error";

const STORAGE_KEY = "qc_sound";

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // Browsers start the context suspended until a user gesture; resume on use.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setSoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  if (on) tone([660, 880], 0.09, "triangle", 0.05); // a little confirmation chirp
}

/** Play one or more notes as a short blip; later notes are staggered. */
function tone(
  freqs: number[],
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.06,
  stagger = 0.06,
): void {
  const ac = audioCtx();
  if (!ac) return;
  const now = ac.currentTime;
  freqs.forEach((f, i) => {
    const t = now + i * stagger;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  });
}

/** Play the cue for a feedback tier. Silent if muted / unsupported. */
export function playSfx(tier: Tier): void {
  if (!soundEnabled()) return;
  switch (tier) {
    case "click":
      tone([420], 0.05, "square", 0.03);
      break;
    case "small":
      tone([660, 990], 0.12, "triangle", 0.05);
      break;
    case "big":
      tone([523, 784, 1046], 0.16, "triangle", 0.06);
      break;
    case "epic":
      // A bright ascending fanfare.
      tone([523, 659, 784, 1046, 1318], 0.28, "sawtooth", 0.05, 0.075);
      break;
    case "error":
      tone([180, 120], 0.16, "sawtooth", 0.05, 0.08);
      break;
  }
}
