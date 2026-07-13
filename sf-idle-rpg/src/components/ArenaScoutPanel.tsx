import { scoutArena } from "@/lib/arena-scout";
import { arenaTier } from "@/lib/elo";
import { GameSprite } from "@/components/GameSprite";
import { fighterSprite } from "@/lib/art/sprite";
import { ChallengeButton } from "@/components/ChallengeButton";

/**
 * Scout the Arena — pick your fight. Shows a few real opponents near your rating
 * with a power sizing and an Elo win-chance, each with a Challenge button that
 * fights that specific hero (vs the random "Enter the Arena" on Overview).
 * Renders nothing until there are other heroes to face.
 */
export default async function ArenaScoutPanel() {
  const scout = await scoutArena();
  if (!scout || scout.candidates.length === 0) return null;

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-black text-gold">🎯 Scout the Arena</h3>
        <span className="text-sm text-muted">
          Your power: <span className="font-bold text-foreground tabular-nums">{scout.myPower}</span>
        </span>
      </div>
      <p className="mb-3 text-sm text-muted">
        Pick your fight — these rivals are closest to your rating.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {scout.candidates.map((o) => {
          const tier = arenaTier(o.rating);
          const winColor =
            o.winPct >= 55 ? "var(--good)" : o.winPct <= 45 ? "var(--bad)" : "var(--muted)";
          const powerColor =
            o.power < scout.myPower ? "var(--good)" : o.power > scout.myPower ? "var(--bad)" : "var(--muted)";
          return (
            <div key={o.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <GameSprite sprite={fighterSprite({ name: o.name, class: o.class })} size={40} title={o.name} />
                <div className="min-w-0">
                  <div className="truncate font-bold leading-tight">{o.name}</div>
                  <div className="text-xs text-muted">
                    Lv {o.level} · <span style={{ color: tier.color }}>{tier.emoji} {o.rating}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md bg-surface-2 px-2.5 py-1.5 text-xs">
                <span className="text-muted">Power</span>
                <span className="font-bold tabular-nums" style={{ color: powerColor }}>
                  {o.power}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-surface-2 px-2.5 py-1.5 text-xs">
                <span className="text-muted">Your odds</span>
                <span className="font-bold tabular-nums" style={{ color: winColor }}>
                  ≈{o.winPct}%
                </span>
              </div>

              <ChallengeButton opponentId={o.id} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
