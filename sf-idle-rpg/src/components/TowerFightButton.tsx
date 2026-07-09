"use client";

import type { ActionResult } from "@/lib/actions";
import { BattleReport } from "@/components/BattleReport";
import { useBattleAction } from "@/components/useBattleAction";

/**
 * Climbs the next Tower floor and plays the boss duel as an animated report
 * (the boss draws its monster medallion). The server action decides the
 * outcome, banks the spoils, and revalidates — this only dramatizes it, and
 * offers a "Fight again" to chain the climb without leaving the report.
 *
 * The action arrives as a prop rather than an import: `climbTower` lives in a
 * server-only module (Prisma, ledger), so a server component hands us the
 * already-resolved action reference, exactly like <ActionButton/> does.
 */
export function TowerFightButton({
  action,
  floor,
}: {
  action: () => Promise<ActionResult>;
  floor: number;
}) {
  const fight = useBattleAction(action);

  return (
    <>
      <button
        type="button"
        disabled={fight.pending}
        onClick={fight.run}
        className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {fight.pending ? "Climbing…" : `Climb to Floor ${floor} ⚔️`}
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

export default TowerFightButton;
