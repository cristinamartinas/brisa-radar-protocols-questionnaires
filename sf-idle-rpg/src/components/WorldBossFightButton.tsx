"use client";

import { useState, useTransition } from "react";
import type { ActionResult, BattleReplay } from "@/lib/actions";
import { BattleReport } from "@/components/BattleReport";

/**
 * Takes a swing at the server-wide World Boss and plays it as an animated
 * report: one mighty blow lands against the shared HP pool (the report opens on
 * the boss's already-chipped bar and closes on a bespoke banner rather than a
 * win/lose verdict). The server action deals the damage, pays the spoils, and
 * revalidates the page; this only dramatizes the strike.
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
            const res = await action();
            if (res.ok && res.battle) setReplay(res.battle);
            else setError(res.ok ? null : res.message);
          })
        }
        className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Striking…" : `⚔️ Strike the Boss (${swingsLeft} left)`}
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

export default WorldBossFightButton;
