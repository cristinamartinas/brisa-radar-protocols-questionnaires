import { loadCharacter } from "@/lib/data";
import { loadBestiary, type BestiaryFoe } from "@/lib/bestiary";
import { GameSprite } from "@/components/GameSprite";
import { foeSprite } from "@/lib/art/sprite";

function FoeCard({ foe }: { foe: BestiaryFoe }) {
  if (!foe.discovered) {
    return (
      <div className="flex flex-col rounded-lg border border-border bg-surface-2 p-3 opacity-60">
        <div className="flex items-center gap-2">
          <div className="grayscale">
            <GameSprite
              sprite={foeSprite({ name: foe.name, emoji: foe.emoji, category: foe.category, discovered: false })}
              size={44}
              title="Undiscovered foe"
            />
          </div>
          <span className="truncate font-bold leading-tight text-muted">???</span>
        </div>
        <p className="mt-2 text-xs italic leading-snug text-muted">
          Undocumented. No corpse, no sketch, no stains — you have never crossed
          blades with this one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start gap-2">
        <GameSprite
          sprite={foeSprite({ name: foe.name, emoji: foe.emoji, category: foe.category, discovered: true })}
          size={44}
          title={foe.name}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold leading-tight">{foe.name}</span>
            <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-good">
              {foe.kills > 0 ? `${foe.kills}× slain` : "spotted"}
            </span>
          </div>
          <p className="mt-1 text-xs leading-snug text-muted">{foe.lore}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Bestiary / Codex — a naturalist's field journal of everything the hero has
 * had the misfortune to meet in combat. Read-only server component: loads the
 * hero, annotates the foe catalog from BattleLog history, and renders it as a
 * completion header plus category-grouped grids of foe cards.
 */
export default async function BestiaryPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const { foes, discovered, total, completion } = await loadBestiary(character.id);

  // Preserve catalog order while grouping into categories for display.
  const categories: { name: string; foes: BestiaryFoe[] }[] = [];
  for (const foe of foes) {
    let group = categories.find((c) => c.name === foe.category);
    if (!group) {
      group = { name: foe.category, foes: [] };
      categories.push(group);
    }
    group.foes.push(foe);
  }

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-4">
        <h3 className="font-black text-gold">📖 Bestiary</h3>
        <p className="text-sm text-muted">
          Field notes, mostly stains. {discovered} of {total} specimens catalogued
          — <span className="text-gold">{completion}%</span> complete.
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {categories.map((group) => (
          <div key={group.name}>
            <div className="mb-2 flex items-center gap-2">
              <h4 className="text-sm font-bold text-muted">{group.name}</h4>
              <span className="text-xs text-muted">
                {group.foes.filter((f) => f.discovered).length}/{group.foes.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.foes.map((foe) => (
                <FoeCard key={foe.key} foe={foe} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
