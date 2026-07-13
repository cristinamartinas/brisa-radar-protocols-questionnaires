import type { Attributes } from "@/lib/game";
import { getRarity, getSlot } from "@/lib/game";
import { GameSprite } from "@/components/GameSprite";
import { itemSprite } from "@/lib/art/sprite";
import { GearCompare } from "@/components/GearCompare";
import { PopoverShell } from "@/components/ui/PopoverShell";
import { equipItem, unequipItem, sellItem } from "@/lib/actions";

// ItemPopover — the universal "what is this item, and what would it do" control.
// A GameSprite trigger that reveals a tooltip on hover OR keyboard focus OR tap
// (group-hover + group-focus-within, so it works on touch and with a keyboard).
// The tooltip shows full stats, price/sell value, a compare-vs-equipped badge,
// and the relevant actions (equip / unequip / sell / buy). Server-rendered — the
// only client code is <PopoverShell>, which handles edge-aware positioning so a
// trigger near the viewport edge never clips the tooltip off-screen.

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
  buyAction,
  affordable = true,
}: {
  item: PopoverItem;
  /** Item currently worn in this slot, for the comparison badge. */
  equipped?: PopoverItem | null;
  variant: "inventory" | "equipped" | "buy" | "stats";
  size?: number;
  /** For the "buy" variant: a (void-returning) server action that buys this item. */
  buyAction?: (formData: FormData) => void | Promise<void>;
  /** For the "buy" variant: whether the hero can currently afford it. */
  affordable?: boolean;
}) {
  const rarity = getRarity(item.rarity);
  const slot = getSlot(item.slot);
  const lines = STATS.filter(([k]) => item[k] > 0);
  const showCompare = variant === "inventory" || variant === "buy" || variant === "stats";
  const showActions = variant !== "stats";

  const trigger = (
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
  );

  return (
    <PopoverShell trigger={trigger}>
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
        {variant === "buy" ? (
          <li className="flex justify-between py-0.5">
            <span className="text-muted">Price</span>
            <span className={`font-bold tabular-nums ${affordable ? "text-gold" : "text-bad"}`}>
              {item.price} 🪙
            </span>
          </li>
        ) : (
          <li className="flex justify-between py-0.5">
            <span className="text-muted">Sell value</span>
            <span className="tabular-nums text-muted">{SELL(item.price)} 🪙</span>
          </li>
        )}
      </ul>

      {showCompare && (variant !== "stats" || equipped) && (
        <div className="mt-2 border-t border-border pt-2">
          <GearCompare candidate={item} equipped={equipped ?? null} />
        </div>
      )}

      {showActions && (
        <div className="mt-2.5 flex gap-2">
          {variant === "buy" ? (
            <form action={buyAction} className="flex-1">
              <button
                disabled={!affordable}
                className="w-full rounded-lg bg-gold px-3 py-1.5 text-sm font-bold text-[#2b1d12] disabled:opacity-40"
              >
                {affordable ? `Buy ${item.price}🪙` : `Need ${item.price}🪙`}
              </button>
            </form>
          ) : variant === "inventory" ? (
            <>
              <form action={equipItem.bind(null, item.id)} className="flex-1">
                <button className="w-full rounded-lg bg-good px-3 py-1.5 text-sm font-bold text-[#10240a]">
                  Equip
                </button>
              </form>
              <form action={sellItem.bind(null, item.id)}>
                <button className="rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold text-muted hover:text-bad">
                  Sell {SELL(item.price)}🪙
                </button>
              </form>
            </>
          ) : (
            <>
              <form action={unequipItem.bind(null, item.id)} className="flex-1">
                <button className="w-full rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold hover:text-gold">
                  Unequip
                </button>
              </form>
              <form action={sellItem.bind(null, item.id)}>
                <button className="rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold text-muted hover:text-bad">
                  Sell {SELL(item.price)}🪙
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </PopoverShell>
  );
}

export default ItemPopover;
