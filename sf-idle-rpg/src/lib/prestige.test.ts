import { describe, it, expect } from "vitest";
import {
  REBIRTH_MIN_LEVEL,
  pointsForRebirth,
  ascensionMultiplier,
  ascensionBonusLabel,
} from "@/lib/prestige";

describe("prestige", () => {
  it("grants no points below the rebirth level", () => {
    expect(pointsForRebirth(REBIRTH_MIN_LEVEL - 1)).toBe(0);
    expect(pointsForRebirth(1)).toBe(0);
  });

  it("grants 1 point per 10 levels at or above the cap", () => {
    expect(pointsForRebirth(30)).toBe(3);
    expect(pointsForRebirth(35)).toBe(3);
    expect(pointsForRebirth(40)).toBe(4);
    expect(pointsForRebirth(100)).toBe(10);
  });

  it("ascension multiplier is +3% per point", () => {
    expect(ascensionMultiplier(0)).toBeCloseTo(1, 6);
    expect(ascensionMultiplier(1)).toBeCloseTo(1.03, 6);
    expect(ascensionMultiplier(10)).toBeCloseTo(1.3, 6);
  });

  it("never goes below 1× for negative/garbage input", () => {
    expect(ascensionMultiplier(-5)).toBe(1);
  });

  it("formats a readable bonus label", () => {
    expect(ascensionBonusLabel(0)).toBe("+0%");
    expect(ascensionBonusLabel(5)).toBe("+15%");
  });
});
