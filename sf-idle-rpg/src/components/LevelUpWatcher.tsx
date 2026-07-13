"use client";

import { useEffect, useRef, useState } from "react";
import { playSfx } from "@/lib/sound";

/**
 * <LevelUpWatcher level={character.level} /> — mounted once on the page. It
 * remembers the last level it saw and, whenever the level prop rises (after any
 * action revalidates the page — quest, arena, dungeon, rest, …), plays a
 * one-shot full-screen "LEVEL UP!" flourish. Source-agnostic by design: it
 * reacts to the number, not to where the XP came from.
 */
export function LevelUpWatcher({ level }: { level: number }) {
  const prev = useRef<number | null>(null);
  const [shownLevel, setShownLevel] = useState<number | null>(null);

  // Reacts to a discrete event — the level actually going up.
  useEffect(() => {
    if (prev.current !== null && level > prev.current) {
      setShownLevel(level);
      playSfx("epic");
      const t = setTimeout(() => setShownLevel(null), 2600);
      prev.current = level;
      return () => clearTimeout(t);
    }
    prev.current = level;
  }, [level]);

  if (shownLevel === null) return null;

  return (
    <div className="levelup-root" role="status" aria-live="polite">
      <div className="levelup-card">
        <div className="levelup-star" aria-hidden="true">
          ⭐
        </div>
        <div className="levelup-title">LEVEL UP!</div>
        <div className="levelup-sub">You reached level {shownLevel}</div>
      </div>
    </div>
  );
}

export default LevelUpWatcher;
