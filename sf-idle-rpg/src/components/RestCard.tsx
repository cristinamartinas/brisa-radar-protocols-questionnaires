import { loadCharacter } from "@/lib/data";
import { restReward, collectRest } from "@/lib/rest";
import { GameSprite } from "@/components/GameSprite";
import { currencySprite } from "@/lib/art/sprite";
import { ActionButton } from "@/components/ActionButton";

/**
 * "While you were away" — surfaces rested gold + XP the hero banked since their
 * last visit, with a one-tap claim. Renders nothing until enough has accrued, so
 * it only greets returning players. Placed at the top of the Overview.
 */
export default async function RestCard() {
  const character = await loadCharacter();
  if (!character) return null;

  // This is an async Server Component: Date.now() is evaluated once per request
  // on the server (not a client re-render), so the request-time clock is exactly
  // what we want here.
  // eslint-disable-next-line react-hooks/purity
  const sinceMs = Date.now() - character.restCollectedAt.getTime();
  const r = restReward(character.level, sinceMs);
  if (!r.ready) return null;

  const away =
    r.hours >= 1
      ? `${Math.floor(r.hours)}h ${Math.round((r.hours % 1) * 60)}m`
      : `${Math.round(r.hours * 60)}m`;

  return (
    <div className="panel mb-6 flex flex-wrap items-center justify-between gap-4 border-gold/40 p-5">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🌙</span>
        <div>
          <h3 className="font-black text-gold">Welcome back!</h3>
          <p className="text-sm text-muted">
            Your hero rested for <span className="font-semibold text-foreground">{away}</span> and
            banked:
          </p>
          <p className="mt-1 flex items-center gap-3 text-sm font-bold">
            <span className="flex items-center gap-1.5 text-gold">
              <GameSprite sprite={currencySprite("GOLD")} size={20} title="Gold" />
              {r.gold.toLocaleString()}
            </span>
            <span className="text-good">+{r.xp.toLocaleString()} XP</span>
          </p>
        </div>
      </div>
      <div className="w-40">
        <ActionButton action={collectRest} className="w-full bg-gold text-[#2b1d12]">
          Collect
        </ActionButton>
      </div>
    </div>
  );
}
