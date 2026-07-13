import { describe, it, expect } from "vitest";
import { damageRange, critChance, mitigation, type Fighter } from "@/lib/game";

function fighter(over: Partial<Fighter> = {}): Fighter {
  return {
    name: "T", class: "WARRIOR", level: 1,
    strength: 40, dexterity: 10, intelligence: 6, constitution: 30, luck: 12,
    ...over,
  };
}

describe("derived combat stats", () => {
  it("damageRange spans 0.6×–1.4× the primary stat, min ≤ max", () => {
    const d = damageRange(fighter()); // warrior → strength 40
    expect(d.min).toBe(24);
    expect(d.max).toBe(56);
    expect(d.min).toBeLessThanOrEqual(d.max);
  });

  it("damageRange follows the class primary stat", () => {
    // mage keys off intelligence
    const d = damageRange(fighter({ class: "MAGE", intelligence: 50 }));
    expect(d.max).toBe(70);
  });

  it("critChance is 5% base + Luck/200, capped at 50%", () => {
    expect(critChance(fighter({ luck: 0 }))).toBeCloseTo(0.05, 6);
    expect(critChance(fighter({ luck: 20 }))).toBeCloseTo(0.15, 6);
    expect(critChance(fighter({ luck: 100000 }))).toBe(0.5);
  });

  it("mitigation is Constitution × 0.3 rounded", () => {
    expect(mitigation(fighter({ constitution: 30 }))).toBe(9);
    expect(mitigation(fighter({ constitution: 0 }))).toBe(0);
  });
});
