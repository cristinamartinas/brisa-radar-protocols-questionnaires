"use client";

import { useEffect, useState, useTransition } from "react";
import { collectExpedition, cancelExpedition } from "@/lib/expeditions";
import type { ActionResult } from "@/lib/actions";

/**
 * Live countdown for an in-progress expedition. Mirrors QuestTimer: the bar and
 * label tick on the client every half-second, but the reward is only granted by
 * the server once the deadline passes (the collect action re-checks the clock).
 *
 * `serverNow` seeds the initial clock so SSR and the first client render agree.
 */
export function ExpeditionTimer({
  title,
  endsAt,
  startedAt,
  serverNow,
  goldReward,
  xpReward,
  dustReward,
}: {
  title: string;
  endsAt: number;
  startedAt: number;
  serverNow: number;
  goldReward: number;
  xpReward: number;
  dustReward: number;
}) {
  const [now, setNow] = useState(serverNow);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(1, endsAt - startedAt);
  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const ready = remainingMs <= 0;
  const pct = Math.min(100, Math.round(((now - startedAt) / total) * 100));

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const clock = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-semibold">🚩 {title}</span>
          <span className="shrink-0 tabular-nums text-muted">
            {ready ? "Returned!" : clock}
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%`, background: ready ? "var(--good)" : "var(--gold)" }}
          />
        </div>
        <div className="mt-1 text-xs text-muted">
          Spoils: {goldReward}🪙 · {xpReward} XP
          {dustReward > 0 ? ` · ${dustReward} ✨` : ""}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() =>
            startTransition(async () => {
              setResult(await collectExpedition());
            })
          }
          className="flex-1 rounded-lg bg-good px-4 py-2.5 font-semibold text-[#10240a] transition active:scale-[0.98] disabled:opacity-40"
        >
          {pending ? "Collecting…" : ready ? "Claim the spoils 🎖️" : "On the march…"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setResult(await cancelExpedition());
            })
          }
          className="rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-muted hover:text-bad"
          title="Abandon expedition (no reward)"
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
