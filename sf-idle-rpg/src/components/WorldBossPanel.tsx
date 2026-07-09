import { loadCharacter } from "@/lib/data";
import { WorldBossFightButton } from "@/components/WorldBossFightButton";
import { GameSprite } from "@/components/GameSprite";
import { fighterSprite } from "@/lib/art/sprite";
import {
  getOrSpawnBoss,
  loadBossContributions,
  countBossHitsToday,
  attackWorldBoss,
  WORLDBOSS_DAILY_CAP,
} from "@/lib/worldboss";

/**
 * World Boss — the whole server ganging up on one enormous foe. Self-contained:
 * ensures a boss is standing, loads the shared HP pool, the top damage-dealers,
 * and this hero's own contribution, then renders a big epic HP bar and an Attack
 * button. The button falls back to a disabled state once the hero has spent
 * their daily swings. Server-authoritative — the action re-checks everything.
 */
export default async function WorldBossPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const boss = await getOrSpawnBoss();
  const [contributions, swungToday] = await Promise.all([
    loadBossContributions(boss.id, character.id),
    countBossHitsToday(character.id, boss.id),
  ]);

  const swingsLeft = Math.max(0, WORLDBOSS_DAILY_CAP - swungToday);
  const capReached = swingsLeft <= 0;
  const hpPct = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));

  return (
    <section className="panel p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black text-gold">🌍 World Boss</h3>
        <span className="text-xs text-muted">
          {swingsLeft}/{WORLDBOSS_DAILY_CAP} swings left today
        </span>
      </div>

      {/* The behemoth */}
      <div className="rounded-lg bg-surface p-4">
        <div className="flex items-center gap-3">
          <GameSprite
            sprite={fighterSprite({ name: boss.name, glyph: boss.emoji, boss: true })}
            size={60}
            title={boss.name}
          />
          <div className="min-w-0">
            <div className="truncate text-lg font-black">{boss.name}</div>
            <div className="text-xs text-muted">
              Level {boss.level} · a server-wide menace
            </div>
          </div>
        </div>

        {/* Shared HP pool */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold">
            <span className="text-bad">HP</span>
            <span className="text-muted">
              {boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()}
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${hpPct}%`,
                background:
                  "linear-gradient(90deg, var(--bad), var(--gold))",
              }}
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          Everyone chips away at the same foe. Deal the most damage for the
          greatest glory — and the fattest cut of the spoils. Never fight alone.
        </p>
      </div>

      {/* Your contribution */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-surface p-3">
        <div>
          <div className="text-sm font-bold">Your onslaught</div>
          <div className="text-xs text-muted">
            {contributions.you.hits > 0
              ? `${contributions.you.damage.toLocaleString()} dmg over ${contributions.you.hits} ${contributions.you.hits === 1 ? "swing" : "swings"}`
              : "You haven't laid a finger on it yet."}
          </div>
        </div>
        {contributions.you.rank ? (
          <span className="shrink-0 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-black text-gold">
            #{contributions.you.rank}
          </span>
        ) : null}
      </div>

      {/* Top contributors */}
      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold text-muted">
          🏅 Top Champions
        </div>
        {contributions.top.length === 0 ? (
          <p className="rounded-lg bg-surface p-3 text-sm text-muted">
            No blood drawn yet. Be the first to strike! ⚔️
          </p>
        ) : (
          <ol className="space-y-1.5 text-sm">
            {contributions.top.map((c, i) => {
              const isYou = c.characterId === character.id;
              return (
                <li
                  key={c.characterId}
                  className="flex items-center justify-between rounded-md px-2 py-1.5"
                  style={{
                    background: isYou ? "var(--surface-2)" : "transparent",
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-center font-black text-muted">
                      {i + 1}
                    </span>
                    <GameSprite
                      sprite={fighterSprite({ name: c.name, class: c.class })}
                      size={22}
                      title={c.name}
                    />
                    <span className="truncate font-semibold">
                      {c.name}
                      {isYou && <span className="text-gold"> (you)</span>}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-good">
                    {c.damage.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Attack */}
      <div className="mt-4">
        {capReached ? (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-lg bg-surface-2 px-4 py-3 font-semibold text-muted opacity-60"
          >
            💤 Out of swings — back tomorrow
          </button>
        ) : (
          <WorldBossFightButton action={attackWorldBoss} swingsLeft={swingsLeft} />
        )}
      </div>
    </section>
  );
}
