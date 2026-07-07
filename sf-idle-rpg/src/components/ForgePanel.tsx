import { loadCharacter } from "@/lib/data";
import { getRarity, getSlot, type Attributes } from "@/lib/game";
import {
  STAT_KEYS,
  salvageValue,
  reforgeCost,
  upgradeCost,
  upgradeCap,
  primaryStatKey,
  isMaxUpgraded,
  salvageItem,
  reforgeItem,
  upgradeItem,
} from "@/lib/forge";

/**
 * The Forge. A self-contained server component: it loads the hero, then lets
 * them melt bag gear into dust and spend that dust to reroll or upgrade any
 * item they own (equipped or bagged). All costs are computed server-side by
 * the same pure helpers the actions use, so what you see is what you pay.
 */

const STAT_ABBR: Record<keyof Attributes, string> = {
  strength: "STR",
  dexterity: "DEX",
  intelligence: "INT",
  constitution: "CON",
  luck: "LCK",
};

type ItemRow = {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  location: string;
  price: number;
} & Attributes;

function itemBonuses(item: ItemRow): string {
  return STAT_KEYS.map((k) => (item[k] > 0 ? `+${item[k]} ${STAT_ABBR[k]}` : ""))
    .filter(Boolean)
    .join(" · ");
}

export default async function ForgePanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const dust = character.dust;
  const items = character.items as ItemRow[];
  const forgeable = items
    .filter((i) => i.location === "INVENTORY" || i.location === "EQUIPPED")
    .sort((a, b) => b.price - a.price);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black text-gold">⚒️ The Forge</h3>
        <span className="text-sm font-bold" title="Crafting dust from salvaged gear">
          ✨ {dust.toLocaleString()} dust
        </span>
      </div>
      <p className="mb-4 text-sm text-muted">
        Melt unwanted gear into dust, then spend it to reforge or upgrade the
        pieces you keep. The blacksmith takes no pleasure in either.
      </p>

      {forgeable.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing to work with. The forge grows cold. Bring gear.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {forgeable.map((item) => {
            const rarity = getRarity(item.rarity);
            const slot = getSlot(item.slot);
            const equipped = item.location === "EQUIPPED";

            const salvage = salvageValue(item);
            const reforge = reforgeCost(item);
            const upgrade = upgradeCost(item);
            const cap = upgradeCap(item);
            const primary = primaryStatKey(item);
            const maxed = isMaxUpgraded(item);

            const canReforge = dust >= reforge;
            const canUpgrade = !maxed && dust >= upgrade;
            const canSalvage = item.location === "INVENTORY";

            return (
              <div
                key={item.id}
                className="flex flex-col rounded-lg border bg-surface p-3"
                style={{ borderColor: rarity.color }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs uppercase tracking-wide"
                    style={{ color: rarity.color }}
                  >
                    {rarity.label}
                  </span>
                  {equipped && (
                    <span className="text-xs font-semibold text-good">equipped</span>
                  )}
                </div>
                <div className="mt-0.5 font-semibold leading-snug">
                  <span style={{ color: rarity.color }}>
                    {slot.emoji} {item.name}
                  </span>
                </div>
                <div className="mt-1 flex-1 text-xs text-muted">
                  {itemBonuses(item) || "No bonuses — a truly humble trinket."}
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  {/* Upgrade: +1 to the item's primary stat */}
                  <form
                    action={async () => {
                      "use server";
                      await upgradeItem(item.id);
                    }}
                  >
                    <button
                      disabled={!canUpgrade}
                      className="w-full rounded-md bg-good px-2 py-1.5 text-sm font-bold text-[#10240a] disabled:opacity-40"
                      title={`Add +1 ${STAT_ABBR[primary]} (cap ${cap})`}
                    >
                      {maxed
                        ? `${STAT_ABBR[primary]} maxed (${cap})`
                        : `Upgrade +1 ${STAT_ABBR[primary]} · ${upgrade} ✨`}
                    </button>
                  </form>

                  {/* Reforge: reroll bonuses at equal budget */}
                  <form
                    action={async () => {
                      "use server";
                      await reforgeItem(item.id);
                    }}
                  >
                    <button
                      disabled={!canReforge}
                      className="w-full rounded-md bg-gold px-2 py-1.5 text-sm font-bold text-[#2b1d12] disabled:opacity-40"
                      title="Reroll this item's stats, keeping the same total"
                    >
                      Reforge · {reforge} ✨
                    </button>
                  </form>

                  {/* Salvage: destroy for dust (bag only) */}
                  <form
                    action={async () => {
                      "use server";
                      await salvageItem(item.id);
                    }}
                  >
                    <button
                      disabled={!canSalvage}
                      className="w-full rounded-md bg-surface-2 px-2 py-1.5 text-sm font-semibold hover:text-bad disabled:opacity-40"
                      title={
                        canSalvage
                          ? "Melt this item down for dust"
                          : "Unequip before salvaging"
                      }
                    >
                      {canSalvage ? `Salvage → ${salvage} ✨` : "Salvage (unequip first)"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
