import { describe, it, expect } from "vitest";
import { applyTonic, tonicPrice, isTonicId, TONIC_DEFS } from "@/lib/tonics";
import type { Fighter } from "@/lib/game";

function fighter(over: Partial<Fighter> = {}): Fighter {
  return {
    name: "T",
    class: "WARRIOR",
    level: 1,
    strength: 40,
    dexterity: 10,
    intelligence: 6,
    constitution: 30,
    luck: 12,
    ...over,
  };
}

describe("tonics", () => {
  it("isTonicId guards the three known ids and nothing else", () => {
    expect(isTonicId("berserk")).toBe(true);
    expect(isTonicId("ironhide")).toBe(true);
    expect(isTonicId("fortune")).toBe(true);
    expect(isTonicId("elixir")).toBe(false);
    expect(isTonicId(null)).toBe(false);
    expect(isTonicId(undefined)).toBe(false);
  });

  it("berserk boosts the class's PRIMARY stat (strength for a warrior)", () => {
    const buffed = applyTonic(fighter(), "berserk");
    // +35% of 40 = 54
    expect(buffed.strength).toBe(54);
    // other stats untouched
    expect(buffed.constitution).toBe(30);
    expect(buffed.luck).toBe(12);
  });

  it("berserk follows the class primary — intelligence for a mage", () => {
    const buffed = applyTonic(fighter({ class: "MAGE", intelligence: 50 }), "berserk");
    expect(buffed.intelligence).toBe(Math.round(50 * 1.35)); // 68
    expect(buffed.strength).toBe(40);
  });

  it("ironhide swells constitution, fortune swells luck", () => {
    expect(applyTonic(fighter(), "ironhide").constitution).toBe(Math.round(30 * 1.4)); // 42
    expect(applyTonic(fighter(), "fortune").luck).toBe(Math.round(12 * 1.6)); // 19
  });

  it("applyTonic is pure — the original fighter is untouched", () => {
    const f = fighter();
    applyTonic(f, "berserk");
    expect(f.strength).toBe(40);
  });

  it("tonicPrice scales up with level and never dips below base", () => {
    const base = TONIC_DEFS.berserk.base;
    expect(tonicPrice("berserk", 1)).toBe(base); // level 1 → no scaling
    expect(tonicPrice("berserk", 11)).toBe(Math.round(base * (1 + 10 * 0.15))); // +150%
    expect(tonicPrice("berserk", 20)).toBeGreaterThan(tonicPrice("berserk", 5));
  });
});
