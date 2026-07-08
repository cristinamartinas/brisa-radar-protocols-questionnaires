import { loadCharacter } from "@/lib/data";
import { loadOnboarding } from "@/lib/onboarding";

/**
 * New Adventurer's Checklist. Self-contained server component that reads the
 * hero and their live onboarding state and renders a warm, self-checking to-do
 * list for the first hour of play. It renders nothing at all for logged-out
 * visitors OR for graduated heroes (everything ticked, or level 10+), so
 * veterans are never nagged — the panel gracefully retires itself.
 *
 * Read-only: no actions, no writes. The next open step gets a one-line mentor
 * hint to point the player at what to try next.
 */
export default async function OnboardingPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const { steps, doneCount, total, graduated } = await loadOnboarding(
    character.id,
  );
  if (graduated) return null;

  const pct = Math.round((doneCount / total) * 100);
  const nextStep = steps.find((s) => !s.done);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-black text-gold">🧭 New Adventurer&apos;s Checklist</h3>
        <span className="text-sm font-semibold text-muted tabular-nums">
          {doneCount} / {total} done
        </span>
      </div>
      <p className="mb-3 text-sm text-muted">
        Welcome to Quest &amp; Cudgel! Knock these out to find your feet — this
        list retires itself once you&apos;re a seasoned hero.
      </p>

      {/* Progress bar */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "var(--gold)" }}
        />
      </div>

      <ul className="space-y-2">
        {steps.map((step) => {
          const isNext = !step.done && step.key === nextStep?.key;
          return (
            <li
              key={step.key}
              className="rounded-lg px-3 py-2"
              style={{
                background: isNext ? "var(--surface-2)" : "var(--surface)",
              }}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="shrink-0">
                  {step.done ? (
                    <span className="text-good">✅</span>
                  ) : (
                    <span className="text-muted">▢</span>
                  )}
                </span>
                <span
                  className={
                    step.done
                      ? "text-muted line-through"
                      : "font-semibold"
                  }
                >
                  {step.emoji} {step.label}
                </span>
                {isNext && (
                  <span className="ml-auto shrink-0 text-xs font-bold text-gold">
                    do this next
                  </span>
                )}
              </div>
              {isNext && (
                <p className="mt-1 pl-6 text-xs text-muted">{step.hint}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
