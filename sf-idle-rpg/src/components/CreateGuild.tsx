"use client";

import { useActionState } from "react";
import { createGuild, type ActionResult } from "@/lib/actions";

export function CreateGuild({ canAfford }: { canAfford: boolean }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(createGuild, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          name="name"
          required
          minLength={3}
          maxLength={24}
          placeholder="Guild name"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <input
          name="tag"
          required
          maxLength={4}
          placeholder="TAG"
          className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm uppercase outline-none focus:border-gold"
        />
      </div>

      {state && !state.ok && <p className="text-xs text-bad">{state.message}</p>}
      {state?.ok && <p className="text-xs text-good">{state.message}</p>}

      <button
        type="submit"
        disabled={pending || !canAfford}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-[#2b1d12] disabled:opacity-40"
      >
        {pending ? "Founding…" : "Found a Guild (500🪙)"}
      </button>
      {!canAfford && (
        <p className="text-xs text-muted">You need 500 gold to found a guild.</p>
      )}
    </form>
  );
}
