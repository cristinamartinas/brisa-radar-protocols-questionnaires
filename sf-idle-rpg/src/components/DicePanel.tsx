import { loadCharacter } from "@/lib/data";
import { loadDice, playDice, winnings, MIN_BET, MAX_BET } from "@/lib/dice";
import { ActionButton } from "@/components/ActionButton";
import { GameSprite } from "@/components/GameSprite";
import { catalogSprite } from "@/lib/art/sprite";

/** Preset stakes for the felt — clamped to what's in the purse at render time. */
const WAGERS = [10, 50, 100, 250] as const;

/**
 * Tavern Dice 🎲🎲 — a backroom 2d6 gamble. Self-contained server component:
 * loads the hero + dice stats, lays out the three calls with their payouts, and
 * offers a grid of preset-stake buttons per call (each bound to playDice, which
 * re-validates and settles server-side). The house edge is printed plainly so
 * the odds are honest, not predatory. Smoky-backroom tone throughout.
 */
export default async function DicePanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const dice = await loadDice(character.id);
  const winRate =
    dice.rolls > 0 ? Math.round((dice.wins / dice.rolls) * 100) : 0;
  const broke = dice.gold < MIN_BET;

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black text-gold">🎲 Tavern Dice</h3>
        <span className="text-xs text-muted">
          {dice.rolls} rolls · {dice.wins}W ({winRate}%) · best {dice.biggestWin}🪙
        </span>
      </div>

      <p className="mb-4 text-sm text-muted">
        A greasy-felt table in the back. Slap gold down, call the bones, and the
        barkeep rolls two dice. The house keeps a thin ~4% cut on every call — no
        cheating, just arithmetic — so a long night here slowly bleeds the purse.
      </p>

      {/* The felt: one row of preset stakes per call. */}
      <div className="grid gap-3 sm:grid-cols-3">
        {dice.bets.map((bet) => {
          const fairish = bet.key === "seven";
          return (
            <div
              key={bet.key}
              className="flex flex-col rounded-lg bg-surface p-4"
              style={
                fairish ? { boxShadow: "0 0 0 1px var(--gold) inset" } : undefined
              }
            >
              <div className="flex items-center gap-2 font-bold leading-tight">
                <GameSprite
                  sprite={catalogSprite({ kind: "dice", id: bet.key, glyph: bet.emoji })}
                  size={30}
                  title={bet.label}
                />
                <span style={fairish ? { color: "var(--gold)" } : undefined}>
                  {bet.label}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted">{bet.blurb}</div>
              <div className="mt-1 mb-3 text-xs text-good">
                pays ×{bet.payout} your stake
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                {WAGERS.map((wager) => {
                  const canBet = wager >= MIN_BET && wager <= dice.gold;
                  return canBet ? (
                    <ActionButton
                      key={wager}
                      action={playDice.bind(null, bet.key, wager)}
                      className="bg-surface-2 text-sm hover:text-gold"
                    >
                      {wager}🪙
                      <span className="block text-xs font-normal text-muted">
                        win {winnings(bet, wager)}
                      </span>
                    </ActionButton>
                  ) : (
                    <button
                      key={wager}
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-lg bg-surface-2 px-4 py-3 text-sm font-semibold opacity-40"
                    >
                      {wager}🪙
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">
        {broke ? (
          <span className="text-bad">
            Your purse is too light to play — stakes start at {MIN_BET}🪙. Go earn
            some coin. 🪙
          </span>
        ) : (
          <>
            Stakes {MIN_BET}🪙–{MAX_BET}🪙, and you can never bet more than the{" "}
            <span className="text-gold">{dice.gold.toLocaleString()}🪙</span> in
            your purse. Lucky Seven is the long shot — rare, but it pays.
          </>
        )}
      </p>
    </section>
  );
}
