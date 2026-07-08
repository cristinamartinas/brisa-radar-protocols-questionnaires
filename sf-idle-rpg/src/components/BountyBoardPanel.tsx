import { loadCharacter } from "@/lib/data";
import { loadBounties, claimBounty, claimAllBounties } from "@/lib/bounties";
import { ActionButton } from "@/components/ActionButton";

/** One-line summary of a currency reward for the UI. */
function rewardLabel(reward: { gold?: number; mushrooms?: number }): string {
  const parts: string[] = [];
  if (reward.gold) parts.push(`+${reward.gold}🪙`);
  if (reward.mushrooms) parts.push(`+${reward.mushrooms}🍄`);
  return parts.join(" ");
}

/**
 * The Bounty Board — a "Wanted" parchment of tougher daily jobs. Self-contained:
 * loads the current hero and today's bounties, then renders each with a
 * progress bar and a Claim button, plus a Claim-all. Server-authoritative — the
 * buttons just call the actions, which re-tally before paying out.
 */
export default async function BountyBoardPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const board = await loadBounties(character.id);
  const claimedCount = board.bounties.filter((b) => b.claimed).length;
  const collectable = board.bounties.filter((b) => b.done && !b.claimed).length;

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-black text-gold">📜 Bounty Board — WANTED</h3>
        <span className="text-xs text-muted">{claimedCount}/{board.bounties.length} collected</span>
      </div>
      <p className="mb-4 text-sm text-muted">
        Bigger jobs, fatter purses. Fresh postings nailed up every day — earn
        them by sundown or they&apos;re gone. No dawdling.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {board.bounties.map((b) => {
          const pct = Math.min(100, Math.round((b.progress / b.goal) * 100));
          return (
            <li key={b.key} className="flex flex-col rounded-lg bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="text-lg">{b.emoji}</span>
                    <span className="truncate">{b.label}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-gold">
                    Purse: {rewardLabel(b.reward)}
                  </div>
                </div>
                <div className="shrink-0">
                  {b.claimed ? (
                    <span className="rounded-md bg-surface-2 px-3 py-1.5 text-sm font-semibold text-good">
                      ✓ Collected
                    </span>
                  ) : b.done ? (
                    <ActionButton
                      action={claimBounty.bind(null, b.key)}
                      className="bg-good text-[#10240a]"
                    >
                      Claim
                    </ActionButton>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-lg bg-surface-2 px-4 py-3 text-sm font-semibold text-muted opacity-60"
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 mb-1 flex justify-between text-xs text-muted">
                <span className={b.done ? "text-good" : ""}>
                  {b.done ? "✓ Earned" : "…in progress"}
                </span>
                <span className="tabular-nums">
                  {Math.min(b.progress, b.goal)}/{b.goal}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: b.done ? "var(--good)" : "var(--gold)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Collect the lot */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {collectable > 0
            ? `${collectable} bounty${collectable === 1 ? "" : "s"} ready to cash in.`
            : "Come back once you've earned a few."}
        </p>
        {collectable > 0 ? (
          <ActionButton action={claimAllBounties} className="bg-gold text-[#2b1d12]">
            Collect all bounties
          </ActionButton>
        ) : (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg bg-surface-2 px-4 py-3 text-sm font-semibold text-muted opacity-60"
          >
            Collect all bounties
          </button>
        )}
      </div>
    </section>
  );
}
