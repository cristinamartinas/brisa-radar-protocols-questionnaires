import { describe, it, expect } from "vitest";
import {
  expectedScore,
  eloUpdate,
  arenaTier,
  tierProgress,
} from "@/lib/elo";

describe("elo", () => {
  it("equal ratings → 50% expected", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 5);
  });

  it("higher rating → higher expected score", () => {
    expect(expectedScore(1800, 1400)).toBeGreaterThan(0.5);
    expect(expectedScore(1400, 1800)).toBeLessThan(0.5);
  });

  it("winner gains rating, loser loses it", () => {
    const win = eloUpdate(1500, 1500, true);
    expect(win.mine).toBeGreaterThan(1500);
    expect(win.delta).toBeGreaterThan(0);

    const loss = eloUpdate(1500, 1500, false);
    expect(loss.mine).toBeLessThan(1500);
    expect(loss.delta).toBeLessThan(0);
  });

  it("beating a stronger opponent is worth more than an equal one", () => {
    const vsStrong = eloUpdate(1500, 1900, true).delta;
    const vsEqual = eloUpdate(1500, 1500, true).delta;
    expect(vsStrong).toBeGreaterThan(vsEqual);
  });

  it("is (near) zero-sum between the two fighters", () => {
    const { mine, theirs } = eloUpdate(1600, 1500, true);
    // one gains ~ what the other loses (within rounding)
    expect(Math.abs(mine - 1600 + (theirs - 1500))).toBeLessThanOrEqual(1);
  });

  it("maps ratings to the right tiers", () => {
    expect(arenaTier(0).name).toBe("Unranked");
    expect(arenaTier(1200).name).toBe("Bronze"); // Silver starts at 1250
    expect(arenaTier(1300).name).toBe("Silver");
    expect(arenaTier(1500).name).toBe("Gold");
    expect(arenaTier(2200).name).toBe("Champion");
  });

  it("tierProgress stays within [0, 1]", () => {
    for (const r of [0, 1100, 1300, 1700, 2500]) {
      const p = tierProgress(r);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    // top tier is always full
    expect(tierProgress(3000)).toBe(1);
  });
});
