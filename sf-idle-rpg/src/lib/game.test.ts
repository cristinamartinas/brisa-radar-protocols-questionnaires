import { describe, it, expect } from "vitest";
import {
  resolveBattle,
  xpForLevel,
  maxHp,
  applyLevelUps,
  generateItem,
  rollQuest,
  effectiveAttributes,
  getClass,
  getRarity,
  SLOTS,
  RARITIES,
  type Fighter,
  type Attributes,
  type Progression,
} from "@/lib/game";
import { makeRng } from "@/lib/rng";

function fighter(over: Partial<Fighter> = {}): Fighter {
  return {
    name: "Test",
    class: "WARRIOR",
    level: 1,
    strength: 15,
    dexterity: 8,
    intelligence: 6,
    constitution: 14,
    luck: 5,
    ...over,
  };
}

describe("progression curves", () => {
  it("xpForLevel matches 50·L² + 50·L", () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(300);
    expect(xpForLevel(3)).toBe(600);
  });

  it("maxHp = con · (level+1) · classHpFactor", () => {
    // warrior hpFactor = 6, con 14, level 1 → 14·2·6 = 168
    expect(maxHp(fighter())).toBe(168);
  });

  it("applyLevelUps consumes banked xp and raises the level", () => {
    const p: Progression = {
      class: "WARRIOR",
      level: 1,
      experience: 450, // 100 → lvl2, 300 → lvl3, 50 remainder
      strength: 15,
      dexterity: 8,
      intelligence: 6,
      constitution: 14,
      luck: 5,
    };
    const strBefore = p.strength;
    const gained = applyLevelUps(p);
    expect(gained).toBe(2);
    expect(p.level).toBe(3);
    expect(p.experience).toBe(50);
    expect(p.strength).toBeGreaterThan(strBefore); // stats grow on level up
  });
});

describe("combat", () => {
  it("is deterministic for a given seed", () => {
    const a = resolveBattle(makeRng("duel-1"), fighter(), fighter({ name: "Foe" }));
    const b = resolveBattle(makeRng("duel-1"), fighter(), fighter({ name: "Foe" }));
    expect(a).toEqual(b);
  });

  it("produces a decisive result and a non-empty log", () => {
    const r = resolveBattle(makeRng("x"), fighter(), fighter({ name: "Foe" }));
    expect(typeof r.won).toBe("boolean");
    expect(r.rounds.length).toBeGreaterThan(1);
  });

  it("a far stronger hero reliably wins", () => {
    const strong = fighter({ name: "Titan", strength: 200, constitution: 200 });
    const weak = fighter({ name: "Peasant", strength: 5, constitution: 5, dexterity: 1 });
    for (const seed of ["a", "b", "c", "d", "e"]) {
      expect(resolveBattle(makeRng(seed), strong, weak).won).toBe(true);
    }
  });
});

describe("itemization", () => {
  it("distributes exactly its stat budget", () => {
    for (const seed of ["i1", "i2", "i3", "i4", "i5"]) {
      for (const level of [1, 10, 50]) {
        const item = generateItem(makeRng(seed + level), level);
        const sum =
          item.strength +
          item.dexterity +
          item.intelligence +
          item.constitution +
          item.luck;
        const budget = Math.max(
          1,
          Math.round((2 + level * 0.7) * getRarity(item.rarity).mult),
        );
        expect(sum).toBe(budget);
        expect(item.price).toBeGreaterThan(0);
        expect(item.name.length).toBeGreaterThan(0);
        expect(SLOTS.some((s) => s.id === item.slot)).toBe(true);
        expect(RARITIES.some((r) => r.id === item.rarity)).toBe(true);
      }
    }
  });
});

describe("effectiveAttributes", () => {
  it("adds only EQUIPPED item bonuses", () => {
    const base: Attributes = {
      strength: 10,
      dexterity: 10,
      intelligence: 10,
      constitution: 10,
      luck: 10,
    };
    const zero = { strength: 0, dexterity: 0, intelligence: 0, constitution: 0, luck: 0 };
    const items = [
      { location: "EQUIPPED", ...zero, strength: 5 },
      { location: "INVENTORY", ...zero, strength: 100 }, // ignored
    ];
    const eff = effectiveAttributes(base, items);
    expect(eff.strength).toBe(15);
    expect(eff.dexterity).toBe(10);
  });
});

describe("quests", () => {
  it("rolls sane, positive rewards", () => {
    for (const seed of ["q1", "q2", "q3"]) {
      const q = rollQuest(makeRng(seed), fighter({ level: 12 }));
      expect(q.goldReward).toBeGreaterThan(0);
      expect(q.xpReward).toBeGreaterThan(0);
      expect(q.mushroomReward).toBeGreaterThanOrEqual(0);
      expect(q.title.length).toBeGreaterThan(0);
    }
  });
});

describe("classes", () => {
  it("resolves every class and defaults safely", () => {
    expect(getClass("WARRIOR").primary).toBe("strength");
    expect(getClass("MAGE").primary).toBe("intelligence");
    expect(getClass("SCOUT").primary).toBe("dexterity");
    expect(getClass("NONSENSE").id).toBe("WARRIOR"); // safe default
  });
});
