import { loadCharacter } from "@/lib/data";
import { prisma } from "@/lib/db";
import { getClass } from "@/lib/game";
import { arenaTier, tierProgress, ARENA_TIERS } from "@/lib/elo";

/**
 * The ranked-ladder standing: your Elo rating, tier, and the top-rated heroes.
 * Read-only; ratings are written by fightArena.
 */
export default async function ArenaLadderPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const tier = arenaTier(character.arenaRating);
  const pct = Math.round(tierProgress(character.arenaRating) * 100);
  const nextTier =
    ARENA_TIERS[ARENA_TIERS.findIndex((t) => t.min === tier.min) + 1] ?? null;

  const top = await prisma.character.findMany({
    orderBy: [{ arenaRating: "desc" }],
    take: 10,
    select: {
      id: true,
      name: true,
      class: true,
      arenaRating: true,
      arenaWins: true,
      arenaLosses: true,
    },
  });

  return (
    <section className="panel mt-6 p-5">
      <h3 className="font-black text-gold">🏟️ Ranked Arena</h3>
      <p className="mt-1 mb-4 text-sm text-muted">
        Every arena bout moves your rating. Climb the tiers — beating stronger
        rivals is worth more.
      </p>

      {/* Your standing */}
      <div className="rounded-lg bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-lg font-black">
            <span className="text-2xl">{tier.emoji}</span>
            <span style={{ color: tier.color }}>{tier.name}</span>
          </span>
          <span className="text-right">
            <span className="text-xl font-black tabular-nums text-gold">
              {character.arenaRating}
            </span>
            <span className="ml-1 text-xs text-muted">rating</span>
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: tier.color }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>
            {character.arenaWins}W – {character.arenaLosses}L
          </span>
          <span>
            {nextTier ? `${nextTier.min - character.arenaRating} to ${nextTier.name}` : "Top tier!"}
          </span>
        </div>
      </div>

      {/* Ladder */}
      <h4 className="mt-4 mb-2 text-sm font-black uppercase tracking-wide text-muted">
        Top of the Ladder
      </h4>
      <ol className="space-y-1 text-sm">
        {top.map((h, i) => {
          const t = arenaTier(h.arenaRating);
          const mine = h.id === character.id;
          return (
            <li
              key={h.id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
              style={{ background: mine ? "var(--surface-2)" : "transparent" }}
            >
              <span className="min-w-0 truncate">
                <span className="text-muted">{i + 1}.</span> {t.emoji}{" "}
                {getClass(h.class).emoji} {h.name}
                {mine && <span className="ml-1 text-xs text-gold">you</span>}
              </span>
              <span className="shrink-0 font-bold tabular-nums" style={{ color: t.color }}>
                {h.arenaRating}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
