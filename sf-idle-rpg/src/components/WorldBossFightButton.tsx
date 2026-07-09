"use client";

import type { ActionResult } from "@/lib/actions";
import { BattleReport } from "@/components/BattleReport";
import { useBattleAction } from "@/components/useBattleAction";

/**
 * Takes a swing at the server-wide World Boss and plays it as an animated
 * report: one mighty blow lands against the shared HP pool (the report opens on
 * the boss's already-chipped bar and closes on a bespoke banner rather than a
 * win/lose verdict). The server action deals the damage, pays the spoils, and
 * revalidates the page; this only dramatizes the strike.
 *
 * Owns the "out of swings" state as well, so this component — and any open
 * report — stays mounted across the revalidation that spends the final swing,
 * rather than being swapped for a static button mid-animation. "Fight again"
 * is offered while swings remain.
 *
 * `attackWorldBoss` is server-only (Prisma, ledger), so — as with
 * <ActionButton/> — a server component passes the resolved action as a prop.
 */
export function WorldBossFightButton({
  action,
  swingsLeft,
}: {
  action: () => Promise<ActionResult>;
  swingsLeft: number;
}) {
  const fight = useBattleAction(action);
  const capReached = swingsLeft <= 0;

  return (
    <>
      {capReached ? (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-lg bg-surface-2 px-4 py-3 font-semibold text-muted opacity-60"
        >
          💤 Out of swings — back tomorrow
        </button>
      ) : (
        <button
          type="button"
          disabled={fight.pending}
          onClick={fight.run}
          className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {fight.pending ? "Striking…" : `⚔️ Strike the Boss (${swingsLeft} left)`}
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
          onFightAgain={capReached ? undefined : fight.run}
          fightPending={fight.pending}
        />
      )}
    </>
  );
}

export default WorldBossFightButton;
