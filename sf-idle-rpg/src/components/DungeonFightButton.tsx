"use client";

import { useState, useTransition } from "react";
import { raidDungeon, type BattleReplay } from "@/lib/actions";
import { BattleReport } from "@/components/BattleReport";

/**
 * Fights the next floor of a dungeon and plays the boss duel as an animated
 * report (the boss draws its monster medallion). Server state — progress, loot,
 * rewards — is revalidated by the action itself.
 */
export function DungeonFightButton({ dungeonKey, floor }: { dungeonKey: string; floor: number }) {
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
            const res = await raidDungeon(dungeonKey);
            if (res.ok && res.battle) setReplay(res.battle);
            else if (!res.ok) setError(res.message);
          })
        }
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Descending…" : `Fight Floor ${floor} ⚔️`}
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

export default DungeonFightButton;
