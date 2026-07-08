"use client";

import { useEffect, useState, useTransition } from "react";
import { collectQuest, cancelQuest, type ActionResult } from "@/lib/actions";

/**
 * Live countdown for an in-progress quest. The bar and label update on the
 * client every half-second; the actual reward is only granted by the server
 * once the deadline has passed (the collect action re-checks the time).
 *
 * The clock seeds from `startedAt` (a stable prop) so SSR and the first client
 * render agree, then a rAF corrects it to the real wall clock right after mount.
 */
export function QuestTimer({
  title,
  endsAt,
  startedAt,
  goldReward,
  xpReward,
}: {
  title: string;
  endsAt: number;
  startedAt: number;
  goldReward: number;
  xpReward: number;
}) {
  const [now, setNow] = useState(startedAt);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  const total = Math.max(1, endsAt - startedAt);
  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const ready = remainingMs <= 0;
  const pct = Math.min(100, Math.round(((now - startedAt) / total) * 100));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-semibold">🧭 {title}</span>
          <span className="shrink-0 tabular-nums text-muted">
            {ready ? "Done!" : `${remainingSec}s`}
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%`, background: ready ? "var(--good)" : "var(--gold)" }}
          />
        </div>
        <div className="mt-1 text-xs text-muted">
          Reward: {goldReward}🪙 · {xpReward} XP
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() =>
            startTransition(async () => {
              setResult(await collectQuest());
            })
          }
          className="flex-1 rounded-lg bg-good px-4 py-2.5 font-semibold text-[#10240a] transition active:scale-[0.98] disabled:opacity-40"
        >
          {pending ? "Collecting…" : ready ? "Collect reward 🎁" : "Adventuring…"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => cancelQuest())}
          className="rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-muted hover:text-bad"
          title="Abandon quest (no reward)"
        >
          ✕
        </button>
      </div>

      {result && !result.ok && (
        <p className="text-sm text-bad" role="status">
          {result.message}
        </p>
      )}
    </div>
  );
}
