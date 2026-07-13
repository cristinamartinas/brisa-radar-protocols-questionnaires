import type { Attributes } from "@/lib/game";
import { getRarity, getSlot } from "@/lib/game";
import { GameSprite } from "@/components/GameSprite";
import { itemSprite } from "@/lib/art/sprite";
import { GearCompare } from "@/components/GearCompare";
import { equipItem, unequipItem, sellItem } from "@/lib/actions";

// ItemPopover — the universal "what is this item, and what would it do" control.
// A GameSprite trigger that reveals a tooltip on hover OR keyboard focus OR tap
// (group-hover + group-focus-within, so it works on touch and with a keyboard).
// The tooltip shows full stats, sell value, a compare-vs-equipped badge, and the
// relevant actions. Server-rendered — the action buttons are plain server-action
// forms, so there's zero client JS.

export type PopoverItem = {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  price: number;
} & Attributes;

const STATS: [keyof Attributes, string][] = [
  ["strength", "Strength"],
  ["dexterity", "Dexterity"],
  ["intelligence", "Intelligence"],
  ["constitution", "Constitution"],
  ["luck", "Luck"],
];

const SELL = (price: number) => Math.max(1, Math.round(price / 2));

export function ItemPopover({
  item,
  equipped,
  variant,
  size = 56,
}: {
  item: PopoverItem;
  /** Item currently worn in this slot, for the comparison badge. */
  equipped?: PopoverItem | null;
  variant: "inventory" | "equipped";
  size?: number;
}) {
  const rarity = getRarity(item.rarity);
  const slot = getSlot(item.slot);
  const lines = STATS.filter(([k]) => item[k] > 0);

  return (
    <div className="group relative inline-flex">
      {/* Trigger — focusable so touch/keyboard can open the tooltip too. */}
      <span
        tabIndex={0}
        role="button"
        aria-label={item.name}
        className="cursor-pointer rounded-xl outline-none ring-gold/60 focus-visible:ring-2"
      >
        <GameSprite
          sprite={itemSprite({ name: item.name, slot: item.slot, rarity: item.rarity, id: item.id })}
          size={size}
          title={item.name}
        />
      </span>

      {/* Tooltip */}
      <div
        role="dialog"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-60 -translate-x-1/2 rounded-xl border border-border bg-surface-2 p-3 opacity-0 shadow-2xl transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
      >
        <div className="mb-1.5 flex items-center gap-2">
          <GameSprite
            sprite={itemSprite({ name: item.name, slot: item.slot, rarity: item.rarity, id: item.id })}
            size={34}
            title={item.name}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-black leading-tight" style={{ color: rarity.color }}>
              {item.name}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted">
              {rarity.label} · {slot.label}
            </div>
          </div>
        </div>

        <ul className="text-[13px]">
          {lines.map(([k, label]) => (
            <li key={k} className="flex justify-between py-0.5">
              <span className="text-muted">{label}</span>
              <span className="font-bold text-good">+{item[k]}</span>
            </li>
          ))}
          <li className="flex justify-between py-0.5">
            <span className="text-muted">Sell value</span>
            <span className="tabular-nums text-muted">{SELL(item.price)} 🪙</span>
          </li>
        </ul>

        {variant === "inventory" && (
          <div className="mt-2 border-t border-border pt-2">
            <GearCompare candidate={item} equipped={equipped ?? null} />
          </div>
        )}

        <div className="mt-2.5 flex gap-2">
          {variant === "inventory" ? (
            <form action={equipItem.bind(null, item.id)} className="flex-1">
              <button className="w-full rounded-lg bg-good px-3 py-1.5 text-sm font-bold text-[#10240a]">
                Equip
              </button>
            </form>
          ) : (
            <form action={unequipItem.bind(null, item.id)} className="flex-1">
              <button className="w-full rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold hover:text-gold">
                Unequip
              </button>
            </form>
          )}
          <form action={sellItem.bind(null, item.id)}>
            <button className="rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold text-muted hover:text-bad">
              Sell {SELL(item.price)}🪙
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ItemPopover;
