import { loadCharacter } from "@/lib/data";
import { loadWheel, spin, describeWheelReward, WHEEL_PRIZES } from "@/lib/wheel";
import { ActionButton } from "@/components/ActionButton";

/**
 * The Wheel of Fortune 🎡 — a once-a-day free spin. Self-contained: loads the
 * current hero and its wheel state, lists the wedges you might land on, and
 * offers the big Spin button (which flips to a "come back tomorrow" state once
 * today's spin is used). Server-authoritative — the button just calls spin(),
 * which re-checks and pays out. Giddy carnival tone throughout.
 */
export default async function WheelPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const wheel = await loadWheel(character.id);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black text-gold">🎡 The Wheel of Fortune</h3>
        <span className="text-xs text-muted">{wheel.totalSpins} spins all-time</span>
      </div>

      <p className="mb-4 text-sm text-muted">
        Step right up! One free spin a day — dazzling prizes, dubious odds, no refunds.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* The wedges you might land on */}
        <ul className="grid grid-cols-2 gap-2">
          {WHEEL_PRIZES.map((prize) => {
            const jackpot = prize.key === "jackpot";
            const blank = prize.key === "blank";
            return (
              <li
                key={prize.key}
                className="rounded-lg bg-surface px-3 py-2 text-sm"
                style={jackpot ? { boxShadow: "0 0 0 1px var(--gold) inset" } : undefined}
              >
                <div className="flex items-center gap-2 font-semibold leading-tight">
                  <span>{prize.emoji}</span>
                  <span
                    className="truncate"
                    style={jackpot ? { color: "var(--gold)" } : undefined}
                  >
                    {prize.label}
                  </span>
                </div>
                <div className={`mt-0.5 text-xs ${blank ? "text-muted" : "text-good"}`}>
                  {blank ? "womp womp" : describeWheelReward(prize.reward)}
                </div>
              </li>
            );
          })}
        </ul>

        {/* The lever */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface-2 p-5 text-center">
          <div className="text-5xl">🎡</div>
          {wheel.canSpin ? (
            <>
              <p className="mt-3 mb-3 text-sm font-semibold text-gold">
                Your free spin is ready — give it a whirl!
              </p>
              <div className="w-full">
                <ActionButton action={spin} className="w-full bg-gold text-[#2b1d12]">
                  🎰 SPIN THE WHEEL!
                </ActionButton>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 mb-3 text-sm text-muted">
                You&apos;ve had your whirl today.
              </p>
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-lg bg-surface px-4 py-3 font-semibold text-muted opacity-60"
              >
                🌙 Come back tomorrow!
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
