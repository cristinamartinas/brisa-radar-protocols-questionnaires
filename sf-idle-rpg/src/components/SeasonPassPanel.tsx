import { loadCharacter } from "@/lib/data";
import {
  loadSeasonPass,
  claimSeasonTier,
  claimAllSeasonTiers,
  describeSeasonReward,
  TIER_COUNT,
} from "@/lib/season";
import { ActionButton } from "@/components/ActionButton";

/**
 * The Seasonal Pass — a self-contained live-ops panel. Loads the current hero
 * and their derived Season Points, then renders a progress header plus a
 * scrollable single-track reward pass. Each tier shows claimed / claimable /
 * locked state with a Claim button, and there's a "Claim all" for everything
 * unlocked. Points are derived and rewards granted server-side; these buttons
 * just call the actions.
 */
export default async function SeasonPassPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const pass = await loadSeasonPass(character.id);
  const claimableCount = pass.tiers.filter(
    (t) => t.unlocked && !t.claimed,
  ).length;

  // Progress toward the next locked tier (the retention carrot).
  const nextTier = pass.tiers.find((t) => !t.unlocked);
  const prevThreshold =
    pass.currentTier > 0 ? pass.tiers[pass.currentTier - 1].threshold : 0;
  const pct = nextTier
    ? Math.min(
        100,
        Math.round(
          ((pass.points - prevThreshold) /
            Math.max(1, nextTier.threshold - prevThreshold)) *
            100,
        ),
      )
    : 100;

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-black text-gold">🎟️ The Seasonal Pass</h3>
        <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted">
          {pass.season.replace("-", " ")}
        </span>
      </div>
      <p className="mb-4 text-sm text-muted">
        Every quest, duel, and dungeon floor earns Season Points. Cross a
        threshold, claim the loot — the more you play, the further you climb. 🚀
      </p>

      {/* Progress header */}
      <div className="rounded-lg bg-surface p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">
              Season Points
            </div>
            <div className="text-3xl font-black text-gold">
              {pass.points.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted">
              Tiers unlocked
            </div>
            <div className="text-2xl font-black text-good">
              {pass.currentTier}
              <span className="text-base font-bold text-muted">
                {" "}
                / {TIER_COUNT}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 mb-1 flex justify-between text-xs text-muted">
          <span>
            {nextTier
              ? `Next: Tier ${nextTier.index + 1}`
              : "Track fully unlocked!"}
          </span>
          <span>
            {nextTier
              ? `${pass.points.toLocaleString()} / ${nextTier.threshold.toLocaleString()} pts`
              : "🏆 Season conquered"}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: "var(--gold)" }}
          />
        </div>
      </div>

      {/* Claim all */}
      {claimableCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3">
          <span className="text-sm font-semibold text-good">
            🎁 {claimableCount} reward{claimableCount === 1 ? "" : "s"} waiting
            to be claimed!
          </span>
          <ActionButton
            action={claimAllSeasonTiers}
            className="bg-gold text-[#2b1d12]"
          >
            Claim all
          </ActionButton>
        </div>
      )}

      {/* Tier track (scrollable) */}
      <div className="mt-4 max-h-[26rem] overflow-y-auto pr-1">
        <ul className="space-y-2">
          {pass.tiers.map((tier) => {
            const claimable = tier.unlocked && !tier.claimed;
            const state = tier.claimed
              ? "claimed"
              : claimable
                ? "claimable"
                : "locked";
            return (
              <li
                key={tier.index}
                className="flex items-center gap-3 rounded-lg bg-surface p-3"
                style={{
                  opacity: state === "locked" ? 0.7 : 1,
                  outline:
                    state === "claimable"
                      ? "1px solid var(--gold)"
                      : undefined,
                }}
              >
                {/* Tier number badge */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black"
                  style={{
                    background:
                      state === "claimed"
                        ? "var(--good)"
                        : state === "claimable"
                          ? "var(--gold)"
                          : "var(--surface-2)",
                    color:
                      state === "claimed"
                        ? "#10240a"
                        : state === "claimable"
                          ? "#2b1d12"
                          : "var(--muted)",
                  }}
                >
                  {state === "claimed" ? "✓" : tier.index + 1}
                </div>

                {/* Reward + threshold */}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gold">
                    {describeSeasonReward(tier.reward)}
                  </div>
                  <div className="text-xs text-muted">
                    {tier.threshold.toLocaleString()} pts
                    {tier.reward.mushrooms ? " · ⭐ milestone" : ""}
                  </div>
                </div>

                {/* State control */}
                <div className="shrink-0">
                  {state === "claimed" && (
                    <span className="text-xs font-semibold text-good">
                      ✓ Claimed
                    </span>
                  )}
                  {state === "claimable" && (
                    <ActionButton
                      action={claimSeasonTier.bind(null, tier.index)}
                      className="bg-good text-[#10240a]"
                    >
                      Claim
                    </ActionButton>
                  )}
                  {state === "locked" && (
                    <span className="text-xs font-semibold text-muted">
                      🔒 Locked
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
