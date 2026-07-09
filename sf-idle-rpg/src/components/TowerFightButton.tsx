"use client";

import { useState, useTransition } from "react";
import type { ActionResult, BattleReplay } from "@/lib/actions";
import { BattleReport } from "@/components/BattleReport";

/**
 * Climbs the next Tower floor and plays the boss duel as an animated report
 * (the boss draws its monster medallion). The server action decides the
 * outcome, banks the spoils, and revalidates — this only dramatizes it.
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
            else if (!res.ok) setError(res.message);
          })
        }
        className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Climbing…" : `Climb to Floor ${floor} ⚔️`}
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

export default TowerFightButton;
