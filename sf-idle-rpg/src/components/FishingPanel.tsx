import { loadCharacter } from "@/lib/data";
import { loadFishing, castLine, RARITY_COLOR } from "@/lib/fishing";
import { ActionButton } from "@/components/ActionButton";
import { GameSprite } from "@/components/GameSprite";
import { catalogSprite } from "@/lib/art/sprite";

/**
 * The Fishing Hole. Self-contained server component: loads the hero and their
 * fishing state, shows the pond, a cooldown-aware Cast button, your best catch
 * and total tally, and the full roster of what's biting. The Cast button only
 * calls the server action — the cooldown, the roll, and the payout are all
 * decided server-side.
 */
export default async function FishingPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const { canCast, cooldownRemainingSec, totalCatches, bestCatch, table } =
    await loadFishing(character.id);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3">
        <h3 className="font-black text-gold">🎣 The Fishing Hole</h3>
        <p className="text-sm text-muted">
          A lazy riverbank a safe distance from anything trying to kill you.
          Cast a line, wait for a nibble, and see what the pond owes you.
        </p>
      </div>

      {/* Pond + cast */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col justify-center rounded-lg bg-surface p-4 text-center">
          <div className="text-5xl">🪷</div>
          <p className="mt-2 text-xs text-muted">
            Still water. Suspiciously deep. Something down there owes rent.
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-lg bg-surface p-4">
          {canCast ? (
            <ActionButton action={castLine} className="w-full bg-good text-[#10240a]">
              Cast a Line 🎣
            </ActionButton>
          ) : (
            <div className="rounded-lg bg-surface-2 px-3 py-3 text-center text-sm font-semibold text-muted">
              🎣 Line resting — cast again in ~{cooldownRemainingSec}s
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <div className="text-muted">Catches</div>
              <div className="font-bold tabular-nums">{totalCatches}</div>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <div className="text-muted">Best catch</div>
              {bestCatch ? (
                <div
                  className="flex items-center gap-2 font-bold"
                  style={{ color: RARITY_COLOR[bestCatch.rarity] }}
                  title={`${bestCatch.name} — ${bestCatch.rarity}`}
                >
                  <GameSprite
                    sprite={catalogSprite({
                      kind: "fish",
                      id: bestCatch.key,
                      glyph: bestCatch.name.split(" ")[0],
                      tint: RARITY_COLOR[bestCatch.rarity],
                    })}
                    size={30}
                    title={bestCatch.name}
                  />
                  <span className="truncate">{bestCatch.name}</span>
                </div>
              ) : (
                <div className="font-bold text-muted">— nothing yet —</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* What's biting */}
      <h4 className="mt-5 mb-2 font-black text-gold">🐟 What&apos;s Biting</h4>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {table.map((fish) => {
          const glyph = fish.name.split(" ")[0];
          return (
            <div
              key={fish.key}
              className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <GameSprite
                  sprite={catalogSprite({
                    kind: "fish",
                    id: fish.key,
                    glyph,
                    tint: RARITY_COLOR[fish.rarity],
                  })}
                  size={30}
                  title={fish.name}
                />
                <span className="min-w-0">
                  <span className="truncate font-semibold">{fish.name}</span>{" "}
                  <span
                    className="text-xs uppercase tracking-wide"
                    style={{ color: RARITY_COLOR[fish.rarity] }}
                  >
                    {fish.rarity}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-gold">{fish.gold}🪙</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
