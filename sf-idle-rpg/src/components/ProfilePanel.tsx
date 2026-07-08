import { loadCharacter, toFighter } from "@/lib/data";
import {
  loadTitles,
  buildTitleContext,
  equipTitle,
  unequipTitle,
  buyTitle,
  TITLE_RARITY,
  type EvaluatedTitle,
} from "@/lib/titles";
import {
  getClass,
  maxHp,
  equippedBonus,
  type Attributes,
} from "@/lib/game";
import { ActionButton } from "@/components/ActionButton";
import { GameSprite } from "@/components/GameSprite";
import { classSprite, catalogSprite } from "@/lib/art/sprite";

const STAT_KEYS: [string, keyof Attributes][] = [
  ["Strength", "strength"],
  ["Dexterity", "dexterity"],
  ["Intelligence", "intelligence"],
  ["Constitution", "constitution"],
  ["Luck", "luck"],
];

function StatChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function TitleCard({ t }: { t: EvaluatedTitle }) {
  const meta = TITLE_RARITY[t.rarity];
  const buyable = !t.unlocked && t.premiumCost != null;

  return (
    <div
      className="flex flex-col rounded-lg border bg-surface p-3 transition"
      style={{
        borderColor: t.equipped
          ? "var(--good)"
          : t.unlocked
            ? meta.color
            : "var(--border)",
        opacity: t.unlocked ? 1 : 0.55,
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className="leading-none"
          style={{ filter: t.unlocked ? "none" : "grayscale(1)" }}
        >
          <GameSprite
            sprite={catalogSprite({
              kind: "title",
              id: t.key,
              glyph: t.emoji,
              tier: t.rarity,
            })}
            size={40}
            title={t.label}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold leading-tight">{t.label}</span>
            <span
              className="shrink-0 text-[10px] font-black uppercase tracking-wide"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-muted">{t.flavor}</p>
        </div>
      </div>

      <div className="mt-3">
        {t.equipped ? (
          <ActionButton
            action={unequipTitle}
            className="w-full bg-good !py-1.5 text-sm text-[#10240a]"
          >
            ✓ Equipped — Unequip
          </ActionButton>
        ) : t.unlocked ? (
          <ActionButton
            action={equipTitle.bind(null, t.key)}
            className="w-full bg-surface-2 !py-1.5 text-sm hover:text-gold"
          >
            Equip
          </ActionButton>
        ) : buyable ? (
          <ActionButton
            action={buyTitle.bind(null, t.key)}
            className="w-full bg-accent !py-1.5 text-sm text-white"
          >
            Buy {t.premiumCost}🍄
          </ActionButton>
        ) : (
          <div className="rounded-md px-1 text-xs text-muted">
            🔒 {t.progressText}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hero Profile — a self-contained showcase of who the hero *is* (as opposed to
 * the action-heavy main columns). Renders a stat card topped by the equipped
 * title, plus the full titles gallery: earned titles in colour with Equip /
 * Unequip, locked ones dimmed with a hint on how to earn them.
 */
export default async function ProfilePanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const cls = getClass(character.class);
  const items = character.items;
  const bonus = equippedBonus(items);
  const fighter = toFighter(character, items);
  const hp = maxHp(fighter);

  const [titles, ctx] = await Promise.all([
    loadTitles(character.id),
    buildTitleContext(character.id),
  ]);

  const equipped = titles.find((t) => t.equipped) ?? null;
  const unlockedCount = titles.filter((t) => t.unlocked).length;

  return (
    <section className="panel mt-6 p-5">
      <h3 className="mb-1 font-black text-gold">🎭 Hero Profile</h3>
      <p className="mb-4 text-sm text-muted">
        Titles are pure bragging rights — earn them, then wear the one you like
        best. {unlockedCount} of {titles.length} unlocked.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity + stats card */}
        <div className="rounded-xl bg-surface-2 p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <GameSprite
              sprite={classSprite(character.class, cls.emoji)}
              size={60}
              title={cls.label}
            />
            <div className="min-w-0">
              <h4 className="truncate text-xl font-black leading-tight">
                {character.name}
              </h4>
              <p className="text-sm font-semibold text-gold">
                {equipped ? (
                  <>
                    {equipped.emoji} {equipped.label}
                  </>
                ) : (
                  <span className="text-muted">No title equipped</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Level {character.level} {cls.label}
              </p>
            </div>
          </div>

          {/* Headline stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <StatChip label="Health" value={<>❤️ {hp}</>} />
            <StatChip
              label="Arena"
              value={
                <>
                  {character.arenaWins}W – {character.arenaLosses}L
                </>
              }
            />
            <StatChip
              label="Gold earned"
              value={
                <span className="text-gold">
                  🪙 {(ctx?.goldEarnedTotal ?? 0).toLocaleString()}
                </span>
              }
            />
            <StatChip
              label="Dungeons cleared"
              value={<>🗝️ {ctx?.dungeonsFullyCleared ?? 0}</>}
            />
            <StatChip
              label="Achievements"
              value={<>🏅 {ctx?.achievementsEarned ?? 0}</>}
            />
            <StatChip
              label="Guild"
              value={
                character.guild ? (
                  <span className="text-good">[{character.guild.tag}]</span>
                ) : (
                  <span className="text-muted">None</span>
                )
              }
            />
          </div>

          {/* Full attributes (base + equipped gear) */}
          <h5 className="mt-5 mb-2 text-xs font-black uppercase tracking-wide text-muted">
            Attributes
          </h5>
          <ul className="space-y-1.5">
            {STAT_KEYS.map(([label, key]) => {
              const primary = cls.primary === key;
              const gearBonus = bonus[key];
              return (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-md px-3 py-1.5"
                  style={{ background: primary ? "var(--surface)" : "transparent" }}
                >
                  <span className="text-muted">
                    {label} {primary && <span className="text-gold">★</span>}
                  </span>
                  <span className="font-bold tabular-nums">
                    {character[key] + gearBonus}
                    {gearBonus > 0 && (
                      <span className="ml-1 text-xs font-normal text-gold">
                        (+{gearBonus})
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Titles gallery */}
        <div className="lg:col-span-2">
          <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-muted">
            Titles Earned
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {titles.map((t) => (
              <TitleCard key={t.key} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
