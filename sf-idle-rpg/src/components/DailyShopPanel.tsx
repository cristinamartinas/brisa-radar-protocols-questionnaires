import { loadCharacter } from "@/lib/data";
import { loadDailyShop, buyDailyItem, type DailyShopItem } from "@/lib/dailyshop";
import { getRarity, type Attributes } from "@/lib/game";
import { ActionButton } from "@/components/ActionButton";

const STAT_ABBR: [keyof Attributes, string][] = [
  ["strength", "STR"],
  ["dexterity", "DEX"],
  ["intelligence", "INT"],
  ["constitution", "CON"],
  ["luck", "LCK"],
];

/** "+3 STR · +1 LCK" — the item's positive stat bonuses, shop-card style. */
function itemBonuses(item: DailyShopItem): string {
  return STAT_ABBR.map(([k, abbr]) => (item[k] > 0 ? `+${item[k]} ${abbr}` : ""))
    .filter(Boolean)
    .join(" · ");
}

/** Turn a seconds countdown into a friendly "5h 12m" refresh hint. */
function refreshHint(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "moments";
}

/**
 * The Daily Deal. Self-contained: loads the current hero and today's rotating,
 * discounted stock, then renders a grid of rarity-bordered cards with an
 * affordability-gated Buy button. Server-authoritative — the buttons just call
 * buyDailyItem, which re-checks before charging.
 */
export default async function DailyShopPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const shop = await loadDailyShop(character.id);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-black text-gold">🛒 The Daily Deal</h3>
        <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
          ⏳ New stock in {refreshHint(shop.refreshInSeconds)}
        </span>
      </div>
      <p className="mb-3 text-sm text-muted">
        Pssst — Today ONLY, friend! Hand-picked gear, a cut above and marked
        down. When the sun comes up it&apos;s all gone. No refunds.
      </p>

      {shop.items.length === 0 ? (
        <p className="text-sm text-muted">
          Shelves are bare today. Come back tomorrow, eh?
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shop.items.map((item) => {
            const rarity = getRarity(item.rarity);
            const affordable = shop.gold >= item.price;
            return (
              <div
                key={item.id}
                className="flex flex-col rounded-lg border bg-surface p-3"
                style={{ borderColor: rarity.color }}
              >
                <div
                  className="text-xs uppercase tracking-wide"
                  style={{ color: rarity.color }}
                >
                  {rarity.label}
                </div>
                <div
                  className="mt-0.5 font-semibold leading-snug"
                  style={{ color: rarity.color }}
                >
                  {item.name}
                </div>
                <div className="mt-1 flex-1 text-xs text-muted">
                  {itemBonuses(item)}
                </div>
                <div className="mt-3">
                  <ActionButton
                    action={buyDailyItem.bind(null, item.id)}
                    className="w-full bg-gold text-[#2b1d12]"
                  >
                    {affordable ? `Buy ${item.price}🪙` : `Need ${item.price}🪙`}
                  </ActionButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
