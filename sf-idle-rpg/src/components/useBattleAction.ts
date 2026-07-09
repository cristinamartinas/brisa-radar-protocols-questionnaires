"use client";

import { useRef, useState, useTransition } from "react";
import type { ActionResult, BattleReplay } from "@/lib/actions";

/**
 * Shared client plumbing for every combat surface (arena, dungeon, tower, world
 * boss). Runs a fight server action, captures the returned {@link BattleReplay}
 * for the animated report, and surfaces any error message.
 *
 * `replayKey` increments on every fresh replay so callers can `key=` the
 * <BattleReport/> — remounting it restarts the animation, which is what makes a
 * "Fight again" from inside the report replay from the top rather than snapping
 * to the finished state.
 */
export function useBattleAction(action: () => Promise<ActionResult>) {
  const [pending, startTransition] = useTransition();
  const [replay, setReplay] = useState<BattleReplay | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const nextKey = useRef(0);

  const run = () =>
    startTransition(async () => {
      setError(null);
      const res = await action();
      if (res.ok && res.battle) {
        nextKey.current += 1;
        setReplayKey(nextKey.current);
        setReplay(res.battle);
      } else if (!res.ok) {
        // A re-fight can fail (a cleared dungeon, an out-of-swings boss) — drop
        // the overlay and let the message explain why.
        setReplay(null);
        setError(res.message);
      }
    });

  return { pending, replay, replayKey, error, run, close: () => setReplay(null) };
}
