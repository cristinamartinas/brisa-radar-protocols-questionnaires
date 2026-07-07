import { loadCharacter } from "@/lib/data";
import {
  TALENT_NODES,
  RESPEC_COST,
  allocateTalent,
  respecTalents,
  availablePoints,
  talentBonuses,
  type TalentNode,
} from "@/lib/talents";
import type { Attributes } from "@/lib/game";

const STAT_ABBR: Record<keyof Attributes, string> = {
  strength: "STR",
  dexterity: "DEX",
  intelligence: "INT",
  constitution: "CON",
  luck: "LCK",
};

/** Render a node's per-rank bonus as "+2 STR · +1 CON". */
function bonusLine(node: TalentNode): string {
  return (Object.keys(STAT_ABBR) as (keyof Attributes)[])
    .map((k) => (node.bonus[k] ? `+${node.bonus[k]} ${STAT_ABBR[k]}` : ""))
    .filter(Boolean)
    .join(" · ");
}

/**
 * The Talent Tree panel: spend the points you earn each level on flat stat
 * bonuses. Everything shown here is re-validated server-side on submit — the
 * disabled states are a courtesy, not a security boundary.
 */
export default async function TalentsPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  // Thin form-action wrappers: the underlying actions return an ActionResult
  // (handy for client callers), but a <form action> must resolve to void.
  async function allocate(node: string) {
    "use server";
    await allocateTalent(node);
  }
  async function respec() {
    "use server";
    await respecTalents();
  }

  const talents = character.talents ?? [];
  const rankOf = (key: string) => talents.find((t) => t.node === key)?.rank ?? 0;
  const points = availablePoints(character.level, talents);
  const totals = talentBonuses(talents);
  const totalsLine = (Object.keys(STAT_ABBR) as (keyof Attributes)[])
    .map((k) => (totals[k] ? `+${totals[k]} ${STAT_ABBR[k]}` : ""))
    .filter(Boolean)
    .join(" · ");

  const spentAny = talents.some((t) => t.rank > 0);
  const canRespec = spentAny && character.gold >= RESPEC_COST;

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-gold">🌳 Talent Tree</h3>
          <p className="mt-1 text-sm text-muted">
            One point per level, no refunds — well, one refund, for a fee.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-lg bg-surface-2 px-3 py-1.5 font-bold">
            {points > 0 ? (
              <span className="text-good">{points} point{points === 1 ? "" : "s"} to spend</span>
            ) : (
              <span className="text-muted">No points to spend</span>
            )}
          </span>
          <form action={respec}>
            <button
              disabled={!canRespec}
              className="rounded-lg bg-surface-2 px-3 py-1.5 font-semibold hover:text-bad disabled:opacity-40"
              title={
                !spentAny
                  ? "Nothing to un-learn."
                  : `Refund every point for ${RESPEC_COST} gold.`
              }
            >
              ↺ Respec ({RESPEC_COST}🪙)
            </button>
          </form>
        </div>
      </div>

      {totalsLine && (
        <p className="mb-3 text-xs text-good">
          Talents are currently granting: {totalsLine}.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TALENT_NODES.map((node) => {
          const rank = rankOf(node.key);
          const maxed = rank >= node.maxRank;

          const gate = node.requires;
          const gateRank = gate ? rankOf(gate.node) : 0;
          const locked = gate ? gateRank < gate.minRank : false;
          const gateLabel = gate
            ? TALENT_NODES.find((n) => n.key === gate.node)?.label ?? gate.node
            : "";

          const affordable = points > 0;
          const canAllocate = !maxed && !locked && affordable;

          return (
            <div
              key={node.key}
              className="flex flex-col rounded-lg border border-border bg-surface p-4"
              style={{ opacity: locked ? 0.6 : 1 }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 font-bold leading-tight">
                  <span className="text-xl">{node.emoji}</span>
                  {node.label}
                </span>
                <span className="shrink-0 rounded bg-surface-2 px-2 py-0.5 text-xs font-bold tabular-nums text-gold">
                  {rank}/{node.maxRank}
                </span>
              </div>

              <p className="mt-2 flex-1 text-xs text-muted">{node.description}</p>

              <div className="mt-2 text-xs font-semibold text-good">
                {bonusLine(node)} <span className="text-muted">/ rank</span>
              </div>

              {locked && (
                <div className="mt-2 text-xs text-bad">
                  🔒 Needs {gate!.minRank} rank(s) of {gateLabel}.
                </div>
              )}

              <form action={allocate.bind(null, node.key)} className="mt-3">
                <button
                  disabled={!canAllocate}
                  className="w-full rounded-md bg-good px-2 py-1.5 text-sm font-bold text-[#10240a] disabled:opacity-40"
                >
                  {maxed
                    ? "Maxed out"
                    : locked
                      ? "Locked"
                      : !affordable
                        ? "No points"
                        : `Allocate → rank ${rank + 1}`}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </section>
  );
}
