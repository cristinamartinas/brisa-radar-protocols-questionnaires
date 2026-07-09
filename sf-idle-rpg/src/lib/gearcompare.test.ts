import { describe, it, expect } from "vitest";
import { gearDelta } from "@/lib/gearcompare";
import type { Attributes } from "@/lib/game";

const attr = (o: Partial<Attributes> = {}): Attributes => ({
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  constitution: 0,
  luck: 0,
  ...o,
});

describe("gearDelta", () => {
  it("treats an empty slot as an all-gain upgrade", () => {
    const d = gearDelta(attr({ strength: 5, luck: 2 }), null);
    expect(d.emptySlot).toBe(true);
    expect(d.net).toBe(7);
    expect(d.stats.find((s) => s.key === "strength")?.delta).toBe(5);
  });

  it("computes per-stat and net deltas against equipped gear", () => {
    const candidate = attr({ strength: 8, dexterity: 1 });
    const equipped = attr({ strength: 3, constitution: 4 });
    const d = gearDelta(candidate, equipped);
    expect(d.emptySlot).toBe(false);
    // +5 STR, +1 DEX, -4 CON → net +2
    expect(d.net).toBe(2);
    expect(d.stats.find((s) => s.key === "strength")?.delta).toBe(5);
    expect(d.stats.find((s) => s.key === "constitution")?.delta).toBe(-4);
  });

  it("reports a downgrade as a negative net", () => {
    expect(gearDelta(attr({ strength: 1 }), attr({ strength: 9 })).net).toBe(-8);
  });

  it("reports a sidegrade as net zero", () => {
    expect(gearDelta(attr({ strength: 5 }), attr({ dexterity: 5 })).net).toBe(0);
  });
});
