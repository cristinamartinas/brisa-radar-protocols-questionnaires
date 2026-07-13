"use client";

import { fightArena } from "@/lib/actions";
import { BattleReport } from "@/components/BattleReport";
import { useBattleAction } from "@/components/useBattleAction";

/** Challenges one specific scouted opponent and plays the animated duel. */
export function ChallengeButton({ opponentId }: { opponentId: string }) {
  const fight = useBattleAction(() => fightArena(opponentId));

  return (
    <>
      <button
        type="button"
        disabled={fight.pending}
        onClick={fight.run}
        className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {fight.pending ? "Fighting…" : "Challenge ⚔️"}
      </button>

      {fight.error && (
        <p className="mt-1 text-xs text-bad" role="status">
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

export default ChallengeButton;
