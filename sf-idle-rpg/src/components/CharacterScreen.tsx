import { loadCharacter, toFighter } from "@/lib/data";
import {
  getClass,
  getSlot,
  maxHp,
  xpForLevel,
  equippedBonus,
  damageRange,
  critChance,
  mitigation,
  type Attributes,
} from "@/lib/game";
import { arenaTier } from "@/lib/elo";
import { autoEquipBestGear } from "@/lib/actions";
import { GameSprite } from "@/components/GameSprite";
import { classSprite, currencySprite, catalogSprite } from "@/lib/art/sprite";
import { StatRow } from "@/components/ui/StatRow";
import { ItemPopover, type PopoverItem } from "@/components/ui/ItemPopover";
import { ActionButton } from "@/components/ActionButton";

const STAT_ROWS: [keyof Attributes, string, string][] = [
  ["strength", "Strength", "💪"],
  ["dexterity", "Dexterity", "🗡️"],
  ["intelligence", "Intelligence", "📖"],
  ["constitution", "Constitution", "🪨"],
  ["luck", "Luck", "🍀"],
];

/** A derived-stat tile (Life / Damage / Crit / Mitigation). */
function DStat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted">{k}</div>
      <div className="mt-0.5 text-lg font-black tabular-nums">{v}</div>
    </div>
  );
}

/** One paper-doll socket: the worn item's popover, or a ghosted empty slot. */
function Slot({
  slotId,
  item,
}: {
  slotId: string;
  item?: PopoverItem;
}) {
  const slot = getSlot(slotId);
  return (
    <div className="flex flex-col items-center gap-1.5">
      {item ? (
        <ItemPopover item={item} variant="equipped" size={64} />
      ) : (
        <span style={{ opacity: 0.4 }}>
          <GameSprite
            sprite={catalogSprite({ kind: "slot", id: slotId, glyph: slot.emoji })}
            size={64}
            title={`Empty ${slot.label.toLowerCase()}`}
          />
        </span>
      )}
      <span className="text-[10px] uppercase tracking-wide text-muted">
        {item ? slot.label : `${slot.label} · empty`}
      </span>
    </div>
  );
}

/**
 * The dedicated Character screen: a paper-doll (hero + Weapon/Armor/Amulet slots
 * framed around it), a StatBlock of attributes + real derived combat numbers, and
 * a Backpack. Every item opens an ItemPopover with stats, compare, and actions.
 * Composed entirely from reusable patterns — see docs/design/ux-plan.md.
 */
export default async function CharacterScreen() {
  const character = await loadCharacter();
  if (!character) return null;

  const cls = getClass(character.class);
  const items = character.items as unknown as (PopoverItem & { location: string })[];
  const bonus = equippedBonus(items);
  const fighter = toFighter(character, items);
  const dmg = damageRange(fighter);
  const tier = arenaTier(character.arenaRating);

  const nextXp = xpForLevel(character.level);
  const xpPct = Math.min(100, Math.round((character.experience / nextXp) * 100));

  const equippedFor = (slotId: string) =>
    items.find((i) => i.location === "EQUIPPED" && i.slot === slotId) ?? null;
  const inventory = items.filter((i) => i.location === "INVENTORY");

  // Slot positions around the hero: weapon top-center, armor & amulet below.
  const weapon = equippedFor("WEAPON") ?? undefined;
  const armor = equippedFor("ARMOR") ?? undefined;
  const amulet = equippedFor("AMULET") ?? undefined;

  return (
    <section className="mt-6 flex flex-col gap-5">
      {/* Identity header */}
      <div className="panel flex flex-wrap items-center gap-5 p-5">
        <GameSprite sprite={classSprite(character.class, cls.emoji)} size={84} title={cls.label} />
        <div className="min-w-[220px] flex-1">
          <h2 className="text-2xl font-black leading-tight">{character.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2.5 text-sm text-muted">
            <span>
              Level {character.level} · {cls.label}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold"
              style={{ color: tier.color, borderColor: tier.color }}
            >
              {tier.emoji} {tier.name}
            </span>
            {character.guild && <span>🏰 {character.guild.name}</span>}
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Experience</span>
              <span className="tabular-nums">
                {character.experience.toLocaleString()} / {nextXp.toLocaleString()}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: "var(--gold)" }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 font-black">
          <span className="flex items-center gap-1.5 text-gold">
            <GameSprite sprite={currencySprite("GOLD")} size={24} title="Gold" />
            {character.gold.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <GameSprite sprite={currencySprite("MUSHROOMS")} size={24} title="Mushrooms" />
            {character.mushrooms}
          </span>
        </div>
      </div>

      {/* Paper-doll + stats */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Paper-doll */}
        <div className="panel p-5">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-muted">Equipment</h3>
          <div className="grid grid-cols-3 items-center justify-items-center gap-y-4">
            <div className="col-start-2 row-start-1">
              <Slot slotId="WEAPON" item={weapon} />
            </div>
            <div className="col-start-2 row-start-2 flex flex-col items-center">
              <GameSprite sprite={classSprite(character.class, cls.emoji)} size={112} title={character.name} />
              <p className="mt-1.5 text-center text-xs text-muted">{cls.label}</p>
            </div>
            <div className="col-start-1 row-start-3">
              <Slot slotId="ARMOR" item={armor} />
            </div>
            <div className="col-start-3 row-start-3">
              <Slot slotId="AMULET" item={amulet} />
            </div>
          </div>
        </div>

        {/* Stat block */}
        <div className="flex flex-col gap-4">
          <div className="panel p-5">
            <h3 className="mb-2.5 text-xs font-black uppercase tracking-wide text-muted">Attributes</h3>
            <ul className="space-y-0.5">
              {STAT_ROWS.map(([key, label, icon]) => (
                <StatRow
                  key={key}
                  icon={icon}
                  label={label}
                  base={character[key]}
                  bonus={bonus[key]}
                  primary={cls.primary === key}
                />
              ))}
            </ul>
          </div>

          <div className="panel p-5">
            <h3 className="mb-2.5 text-xs font-black uppercase tracking-wide text-muted">Combat</h3>
            <div className="grid grid-cols-2 gap-2">
              <DStat k="❤️ Life" v={maxHp(fighter).toLocaleString()} />
              <DStat k="⚔️ Damage" v={`${dmg.min}–${dmg.max}`} />
              <DStat k="🎯 Crit chance" v={`${Math.round(critChance(fighter) * 100)}%`} />
              <DStat k="🛡️ Mitigation" v={`${mitigation(fighter)} / hit`} />
            </div>
            <p className="mt-2.5 text-xs text-muted">
              ⚡ Strikes first when Dexterity ≥ the opponent&apos;s. Damage scales off your
              primary stat, crit off Luck, Life off Constitution × level.
            </p>
          </div>
        </div>
      </div>

      {/* Backpack */}
      <div className="panel p-5">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-black text-gold">
            🎒 Backpack
            <span className="text-sm font-semibold text-muted">{inventory.length} in bag</span>
          </h3>
          {inventory.length > 0 && (
            <div className="w-52">
              <ActionButton action={autoEquipBestGear} className="w-full bg-surface-2 !py-2 text-sm hover:text-gold">
                ⭐ Auto-equip best gear
              </ActionButton>
            </div>
          )}
        </div>

        {inventory.length === 0 ? (
          <p className="rounded-lg bg-surface px-4 py-6 text-center text-sm text-muted">
            Your bag is empty. Win fights and raid dungeons for loot, or buy gear in the Market.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {inventory.map((item) => (
              <ItemPopover
                key={item.id}
                item={item}
                equipped={equippedFor(item.slot)}
                variant="inventory"
                size={56}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
