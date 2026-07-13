import { prisma } from "@/lib/db";
import { loadCharacter, toFighter } from "@/lib/data";
import { primaryValue, maxHp, type Fighter } from "@/lib/game";
import { expectedScore } from "@/lib/elo";

// ---------------------------------------------------------------------------
// Arena scouting — surface a few real opponents near the hero's rating so the
// player can pick a fight instead of getting a blind random one. Read-only.
// ---------------------------------------------------------------------------

/** A rough single-number "how tough is this hero" score, for at-a-glance sizing. */
export function combatPower(f: Fighter): number {
  return Math.round(
    primaryValue(f) * 1.5 +
      maxHp(f) / 8 +
      (f.strength + f.dexterity + f.intelligence + f.constitution + f.luck),
  );
}

export interface ScoutedOpponent {
  id: string;
  name: string;
  class: string;
  level: number;
  rating: number;
  power: number;
  /** Elo-expected chance the hero wins, as a whole percent. */
  winPct: number;
}

export interface ArenaScout {
  myPower: number;
  myRating: number;
  candidates: ScoutedOpponent[];
}

/** The hero's power + up to 4 real opponents closest to their rating. */
export async function scoutArena(): Promise<ArenaScout | null> {
  const me = await loadCharacter();
  if (!me) return null;

  const myPower = combatPower(toFighter(me, me.items));

  const others = await prisma.character.findMany({
    where: { id: { not: me.id } },
    include: { items: true },
    take: 40,
  });

  const candidates: ScoutedOpponent[] = others
    .map((o) => ({
      id: o.id,
      name: o.name,
      class: o.class,
      level: o.level,
      rating: o.arenaRating,
      power: combatPower(toFighter(o, o.items)),
      winPct: Math.round(expectedScore(me.arenaRating, o.arenaRating) * 100),
    }))
    .sort(
      (a, b) => Math.abs(a.rating - me.arenaRating) - Math.abs(b.rating - me.arenaRating),
    )
    .slice(0, 4);

  return { myPower, myRating: me.arenaRating, candidates };
}
