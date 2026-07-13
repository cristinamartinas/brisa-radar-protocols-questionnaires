import { loadCharacter } from "@/lib/data";
import { loadTonics, TONIC_IDS, TONIC_DEFS } from "@/lib/tonics";
import { buyTonic, armTonic } from "@/lib/tonics-actions";
import { GameSprite } from "@/components/GameSprite";
import { catalogSprite } from "@/lib/art/sprite";
import { ActionButton } from "@/components/ActionButton";

/**
 * The Alchemist — the shelf for Battle Tonics (the game's consumables). Buy a
 * tonic with gold, then arm one for your next arena fight: it spends on that
 * duel, buffing a combat stat. Self-contained server component; the buy/arm
 * buttons are server actions that re-check server-side.
 */
export default async function TonicsPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const view = await loadTonics(character.id, character.level, character.gold);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-black text-gold">🧪 The Alchemist</h3>
        {view.armed ? (
          <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-semibold text-good">
            {TONIC_DEFS[view.armed].emoji} {TONIC_DEFS[view.armed].name} armed for your next fight
          </span>
        ) : (
          <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
            No tonic armed
          </span>
        )}
      </div>
      <p className="mb-3 text-sm text-muted">
        Single-use brews for the arena. Buy a few, arm one, then fight — it&apos;ll
        pep up a combat stat for that duel and then it&apos;s gone. No, they&apos;re
        not regulated.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TONIC_IDS.map((id) => {
          const def = TONIC_DEFS[id];
          const owned = view.counts[id];
          const price = view.prices[id];
          const affordable = view.gold >= price;
          const armed = view.armed === id;

          return (
            <div
              key={id}
              className="flex flex-col rounded-lg border bg-surface p-3"
              style={{ borderColor: armed ? "var(--good)" : "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <GameSprite
                  sprite={catalogSprite({ kind: "tonic", id, glyph: def.emoji, shape: "round" })}
                  size={40}
                  title={def.name}
                />
                <div className="min-w-0">
                  <div className="font-bold leading-tight">{def.name}</div>
                  <div className="text-xs text-muted">In stock: {owned}</div>
                </div>
              </div>

              <p className="mt-2 flex-1 text-xs text-muted">{def.blurb}</p>

              <div className="mt-3 flex flex-col gap-1.5">
                <ActionButton
                  action={buyTonic.bind(null, id)}
                  className="w-full bg-gold text-[#2b1d12]"
                >
                  {affordable ? `Buy · ${price}🪙` : `Need ${price}🪙`}
                </ActionButton>
                <ActionButton
                  action={armTonic.bind(null, id)}
                  className={
                    armed
                      ? "w-full bg-good text-[#10240a]"
                      : "w-full bg-surface-2 hover:text-gold"
                  }
                >
                  {armed ? "Armed ✓ — tap to stow" : owned > 0 ? "Arm for next fight" : "Arm (buy one first)"}
                </ActionButton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
