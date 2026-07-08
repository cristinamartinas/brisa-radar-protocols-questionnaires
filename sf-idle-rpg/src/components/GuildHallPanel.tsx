import { loadCharacter } from "@/lib/data";
import { loadGuildHall, upgradeRoom } from "@/lib/guildhall";
import { ActionButton } from "@/components/ActionButton";
import { GameSprite } from "@/components/GameSprite";
import { catalogSprite } from "@/lib/art/sprite";

/**
 * The Guild Hall: a shared, upgradable clubhouse. Members pool gold to level
 * rooms, each of which grants a described perk. Everything shown is
 * re-validated server-side on submit — the disabled buttons are a courtesy of
 * the Guild Bureaucracy, not a security boundary.
 */
export default async function GuildHallPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  // No guild, no hall. A gentle nudge toward the charter office.
  if (!character.guildId || !character.guild) {
    return (
      <section className="panel mt-6 p-5">
        <h3 className="font-black text-gold">🏛️ Guild Hall</h3>
        <p className="mt-2 text-sm text-muted">
          You belong to no guild, and so command no hall. Join a charter or
          found your own to break ground on a Treasury, a Barracks, and grander
          things besides.
        </p>
      </section>
    );
  }

  const rooms = await loadGuildHall(character.guildId);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-gold">🏛️ Guild Hall</h3>
          <p className="mt-1 text-sm text-muted">
            The shared hall of{" "}
            <span className="font-semibold text-gold">
              {character.guild.name}
            </span>{" "}
            <span className="text-xs text-muted">[{character.guild.tag}]</span>.
            Any member may contribute gold to raise a room; the perks are shared
            by all.
          </p>
        </div>
        <span className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-bold">
          <span className="text-gold">🪙 {character.gold.toLocaleString()}</span>{" "}
          <span className="text-muted">in your purse</span>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const affordable = character.gold >= room.upgradeCost;

          return (
            <div
              key={room.key}
              className="flex flex-col rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 font-bold leading-tight">
                  <GameSprite
                    sprite={catalogSprite({ kind: "guildroom", id: room.key, glyph: room.emoji })}
                    size={36}
                    title={room.name}
                  />
                  {room.name}
                </span>
                <span className="shrink-0 rounded bg-surface-2 px-2 py-0.5 text-xs font-bold tabular-nums text-gold">
                  Lv {room.level}/{room.maxLevel}
                </span>
              </div>

              <p className="mt-2 text-xs text-muted">{room.description}</p>

              {/* Current perk (or the empty-plot line) */}
              <div className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-xs">
                <div className="uppercase tracking-wide text-muted">
                  Current perk
                </div>
                <div
                  className="mt-0.5 font-semibold"
                  style={{
                    color: room.level > 0 ? "var(--good)" : "var(--muted)",
                  }}
                >
                  {room.currentPerk.description}
                </div>
              </div>

              {/* Next level preview */}
              {room.nextPerk ? (
                <div className="mt-2 flex-1 text-xs text-muted">
                  <span className="font-semibold text-gold">
                    Next (Lv {room.level + 1}):
                  </span>{" "}
                  {room.nextPerk.description}
                </div>
              ) : (
                <div className="mt-2 flex-1 text-xs font-semibold text-gold">
                  🏛️ Fully built — a jewel of the charter.
                </div>
              )}

              <div className="mt-3">
                {room.maxed ? (
                  <div className="rounded-lg bg-surface-2 px-3 py-2 text-center text-sm font-semibold text-good">
                    🏛️ Fully built
                  </div>
                ) : (
                  <ActionButton
                    action={upgradeRoom.bind(null, room.key)}
                    className="w-full bg-gold text-[#2b1d12] disabled:opacity-40"
                  >
                    {affordable
                      ? `Contribute ${room.upgradeCost}🪙 → Lv ${room.level + 1}`
                      : `Needs ${room.upgradeCost}🪙`}
                  </ActionButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
