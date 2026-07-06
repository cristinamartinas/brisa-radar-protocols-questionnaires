"use client";

import { useActionState, useState } from "react";
import { register, login } from "@/lib/auth";
import { type ActionResult } from "@/lib/actions";
import { CLASSES } from "@/lib/game";

export function AuthScreen() {
  const [mode, setMode] = useState<"register" | "login">("register");

  return (
    <div className="mx-auto w-full max-w-2xl panel p-6 sm:p-8">
      <h1 className="text-3xl font-black tracking-tight text-gold">
        Quest &amp; Cudgel
      </h1>
      <p className="mt-1 text-muted">
        A tiny satirical idle RPG. Create an account to start adventuring.
      </p>

      <div className="mt-6 mb-6 flex gap-2 rounded-lg bg-surface p-1 text-sm">
        {(["register", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="flex-1 rounded-md px-3 py-2 font-semibold capitalize transition"
            style={{
              background: mode === m ? "var(--surface-2)" : "transparent",
              color: mode === m ? "var(--gold)" : "var(--muted)",
            }}
          >
            {m === "register" ? "New hero" : "Log in"}
          </button>
        ))}
      </div>

      {mode === "register" ? <RegisterForm /> : <LoginForm />}
    </div>
  );
}

function RegisterForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(register, null);
  const [selected, setSelected] = useState(CLASSES[0].id);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">
            Hero name
          </span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={20}
            placeholder="Sir Clicks-a-Lot"
            className="rounded-lg border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="at least 6 characters"
            className="rounded-lg border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        </label>
      </div>

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

      {state && !state.ok && <p className="text-sm text-bad">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold px-4 py-3 font-black text-[#2b1d12] transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Summoning…" : "Enter the Realm ⚔️"}
      </button>
    </form>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(login, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted">
          Hero name
        </span>
        <input
          name="name"
          required
          className="rounded-lg border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          className="rounded-lg border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
      </label>

      {state && !state.ok && <p className="text-sm text-bad">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold px-4 py-3 font-black text-[#2b1d12] transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Entering…" : "Log in"}
      </button>
    </form>
  );
}
