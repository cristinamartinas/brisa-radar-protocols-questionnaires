"use client";

import { useState, useTransition } from "react";
import { fightArena, type BattleReplay } from "@/lib/actions";
import { BattleReport } from "@/components/BattleReport";

/**
 * The Arena entry point. Runs the server-side fight, then plays the returned
 * BattleReplay as an animated report. Server state (gold, rating, logs) is
 * revalidated by the action itself; this component only owns the animation.
 */
export function ArenaButton() {
  const [pending, startTransition] = useTransition();
  const [replay, setReplay] = useState<BattleReplay | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await fightArena();
            if (res.ok && res.battle) setReplay(res.battle);
            else if (!res.ok) setError(res.message);
          })
        }
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Entering the lists…" : "Enter the Arena"}
      </button>

      {error && (
        <p className="mt-2 text-sm text-bad" role="status">
          {error}
        </p>
      )}

      {replay && <BattleReport replay={replay} onClose={() => setReplay(null)} />}
    </>
  );
}

export default ArenaButton;
