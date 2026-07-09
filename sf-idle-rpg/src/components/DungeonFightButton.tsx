"use client";

import { raidDungeon } from "@/lib/actions";
import { BattleReport } from "@/components/BattleReport";
import { useBattleAction } from "@/components/useBattleAction";

/**
 * Fights the next floor of a dungeon and plays the boss duel as an animated
 * report (the boss draws its monster medallion). Server state — progress, loot,
 * rewards — is revalidated by the action itself.
 *
 * Owns the "Conquered" terminal state too (rather than a sibling in the page):
 * that keeps this component — and any open report overlay — mounted across the
 * revalidation that clears the final floor, instead of being swapped out mid-
 * animation. "Fight again" is offered until the dungeon is cleared.
 */
export function DungeonFightButton({
  dungeonKey,
  floor,
  cleared = false,
}: {
  dungeonKey: string;
  floor: number;
  cleared?: boolean;
}) {
  const fight = useBattleAction(() => raidDungeon(dungeonKey));

  return (
    <>
      {cleared ? (
        <div className="rounded-lg bg-surface-2 px-3 py-2 text-center text-sm font-semibold text-good">
          🏅 Conquered
        </div>
      ) : (
        <button
          type="button"
          disabled={fight.pending}
          onClick={fight.run}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {fight.pending ? "Descending…" : `Fight Floor ${floor} ⚔️`}
        </button>
      )}

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
          onFightAgain={cleared ? undefined : fight.run}
          fightPending={fight.pending}
        />
      )}
    </>
  );
}

export default DungeonFightButton;
