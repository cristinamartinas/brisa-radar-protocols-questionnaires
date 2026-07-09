"use client";

import { fightArena } from "@/lib/actions";
import { BattleReport } from "@/components/BattleReport";
import { useBattleAction } from "@/components/useBattleAction";

/**
 * The Arena entry point. Runs the server-side fight, then plays the returned
 * BattleReplay as an animated report. Server state (gold, rating, logs) is
 * revalidated by the action itself; this component only owns the animation.
 */
export function ArenaButton() {
  const fight = useBattleAction(fightArena);

  return (
    <>
      <button
        type="button"
        disabled={fight.pending}
        onClick={fight.run}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {fight.pending ? "Entering the lists…" : "Enter the Arena"}
      </button>

      {fight.error && (
        <p className="mt-2 text-sm text-bad" role="status">
          {fight.error}
        </p>
      )}

      {fight.replay && (
        <BattleReport
          key={fight.replayKey}
          replay={fight.replay}
          onClose={fight.close}
          onFightAgain={fight.run}
          fightPending={fight.pending}
        />
      )}
    </>
  );
}

export default ArenaButton;
