"use client";

import { useEffect, useRef, useState } from "react";
import type { ActionResult } from "@/lib/actions";
import { celebrationFor, floatAmountFor, type CelebrationTier } from "./celebrate";

/**
 * <Celebration result={...} /> — a self-contained, pointer-events-none overlay
 * that plays a brief flourish whenever a NEW successful ActionResult arrives.
 *
 * The orchestrator mounts this inside ActionButton's (position: relative) result
 * area; it absolutely-positions itself over that parent and self-dismisses after
 * ~1.2s. All motion lives in globals.css (.juice-*) and is disabled under
 * prefers-reduced-motion, which falls back to a plain fade.
 *
 * It owns no game state — it purely reacts to the `result` prop.
 */

const DURATION_MS = 1200;
const CONFETTI_COUNT = 12;
// Warm parchment-friendly confetti, drawn from the design tokens.
const CONFETTI_COLORS = ["var(--gold)", "var(--good)", "var(--accent)", "var(--foreground)"];

interface Shown {
  /** Monotonic key so each new celebration remounts and replays cleanly. */
  key: number;
  tier: Exclude<CelebrationTier, "none">;
  emoji?: string;
  label?: string;
  amount: string | null;
}

export function Celebration({ result }: { result: ActionResult | null }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const seq = useRef(0);
  // Track the last result object identity so we only fire on genuinely new ones.
  const lastResult = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (!result || result === lastResult.current) return;
    lastResult.current = result;
    if (!result.ok) {
      setShown(null);
      return;
    }
    const c = celebrationFor(result.message);
    if (c.tier === "none") {
      setShown(null);
      return;
    }
    seq.current += 1;
    setShown({
      key: seq.current,
      tier: c.tier,
      emoji: c.emoji,
      label: c.label,
      amount: floatAmountFor(result.message),
    });
  }, [result]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), DURATION_MS);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;

  return (
    <div
      key={shown.key}
      className={`juice-root juice-${shown.tier}`}
      aria-hidden="true"
    >
      <div className="juice-badge">
        {shown.emoji && <span className="juice-emoji">{shown.emoji}</span>}
        {shown.label && <span className="juice-label">{shown.label}</span>}
      </div>

      {shown.amount && <div className="juice-float">{shown.amount}</div>}

      {shown.tier === "epic" && (
        <div className="juice-confetti">
          {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
            <span
              key={i}
              className="juice-piece"
              style={
                {
                  "--i": i,
                  "--x": `${(i / (CONFETTI_COUNT - 1)) * 100}%`,
                  "--delay": `${(i % 4) * 60}ms`,
                  background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Celebration;
