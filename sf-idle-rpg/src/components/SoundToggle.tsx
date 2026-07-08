"use client";

import { useEffect, useState } from "react";
import { soundEnabled, setSoundEnabled } from "@/lib/sound";

/** A compact 🔊/🔇 toggle for the header. Persists to localStorage. */
export function SoundToggle() {
  // Start null so SSR and first client render agree (avoids a hydration flash);
  // resolve the real value after mount.
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    setOn(soundEnabled());
  }, []);

  const toggle = () => {
    const next = !(on ?? true);
    setSoundEnabled(next); // plays a confirmation chirp when turning on
    setOn(next);
  };

  const label = on === false ? "🔇" : "🔊";

  return (
    <button
      type="button"
      onClick={toggle}
      title={on === false ? "Sound off" : "Sound on"}
      aria-label={on === false ? "Turn sound on" : "Turn sound off"}
      className="rounded-md bg-surface-2 px-2.5 py-1.5 text-sm text-muted transition hover:text-gold"
    >
      {label}
    </button>
  );
}
