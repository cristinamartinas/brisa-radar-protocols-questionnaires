import { loadCharacter } from "@/lib/data";
import { loadDailyShop, buyDailyItem } from "@/lib/dailyshop";
import { ItemPopover } from "@/components/ui/ItemPopover";

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

  // What's equipped in a slot, for the gear-comparison badge.
  const equippedFor = (slotId: string) =>
    character.items.find((i) => i.location === "EQUIPPED" && i.slot === slotId) ?? null;

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
        <div className="flex flex-wrap gap-4">
          {shop.items.map((item) => {
            const affordable = shop.gold >= item.price;
            return (
              <div key={item.id} className="flex flex-col items-center gap-1.5">
                <ItemPopover
                  item={item}
                  equipped={equippedFor(item.slot)}
                  variant="buy"
                  buyAction={async () => {
                    "use server";
                    await buyDailyItem(item.id);
                  }}
                  affordable={affordable}
                />
                <span
                  className={`text-xs font-bold tabular-nums ${affordable ? "text-gold" : "text-muted"}`}
                >
                  {item.price}🪙
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
