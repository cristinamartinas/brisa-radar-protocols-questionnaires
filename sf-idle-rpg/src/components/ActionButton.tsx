"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actions";

/**
 * Runs a no-argument server action, shows a pending state, and surfaces the
 * action's returned message. The page revalidates server-side, so stats
 * update automatically; this just narrates what happened.
 */
export function ActionButton({
  action,
  children,
  className = "",
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(await action());
          })
        }
        className={`rounded-lg px-4 py-3 font-semibold transition active:scale-[0.98] disabled:opacity-60 ${className}`}
      >
        {pending ? "…adventuring…" : children}
      </button>

      {result && (
        <p
          className="text-sm leading-snug rounded-md px-3 py-2 panel"
          style={{ color: result.ok ? "var(--foreground)" : "var(--bad)" }}
          role="status"
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
