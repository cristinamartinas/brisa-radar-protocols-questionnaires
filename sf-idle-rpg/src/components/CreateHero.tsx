"use client";

import { useActionState, useState } from "react";
import { createCharacter, type ActionResult } from "@/lib/actions";
import { CLASSES } from "@/lib/game";

export function CreateHero() {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(createCharacter, null);
  const [selected, setSelected] = useState(CLASSES[0].id);

  return (
    <div className="mx-auto w-full max-w-2xl panel p-6 sm:p-8">
      <h1 className="text-3xl font-black tracking-tight text-gold">
        Quest &amp; Cudgel
      </h1>
      <p className="mt-1 text-muted">
        A tiny satirical idle RPG. Roll a hero and start adventuring.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">
            Hero name
          </span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={20}
            placeholder="e.g. Sir Clicks-a-Lot"
            className="rounded-lg border border-border bg-surface px-4 py-3 text-foreground outline-none focus:border-gold"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold uppercase tracking-wide text-muted">
            Choose your class
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {CLASSES.map((c) => {
              const active = selected === c.id;
              return (
                <label
                  key={c.id}
                  className="cursor-pointer rounded-lg border p-4 transition"
                  style={{
                    borderColor: active ? "var(--gold)" : "var(--border)",
                    background: active ? "var(--surface-2)" : "var(--surface)",
                  }}
                >
                  <input
                    type="radio"
                    name="class"
                    value={c.id}
                    checked={active}
                    onChange={() => setSelected(c.id)}
                    className="sr-only"
                  />
                  <div className="text-2xl">{c.emoji}</div>
                  <div className="mt-1 font-bold">{c.label}</div>
                  <div className="mt-1 text-xs text-muted">{c.blurb}</div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {state && !state.ok && (
          <p className="text-sm text-bad">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gold px-4 py-3 font-black text-[#2b1d12] transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Summoning…" : "Enter the Realm ⚔️"}
        </button>
      </form>
    </div>
  );
}
