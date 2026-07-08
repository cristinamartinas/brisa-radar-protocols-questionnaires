import { describe, it, expect } from "vitest";
import { makeRng, randomSeed, pick, randInt, chance } from "@/lib/rng";

describe("rng", () => {
  it("is deterministic: same seed → identical sequence", () => {
    const a = Array.from({ length: 20 }, () => makeRng("seed-α")());
    const b = Array.from({ length: 20 }, () => makeRng("seed-α")());
    expect(a).toEqual(b);
  });

  it("different seeds → different sequences", () => {
    const a = Array.from({ length: 20 }, () => makeRng("seed-α")());
    const b = Array.from({ length: 20 }, () => makeRng("seed-β")());
    expect(a).not.toEqual(b);
  });

  it("produces values in [0, 1)", () => {
    const r = makeRng("range");
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("pick is deterministic and in-bounds", () => {
    const arr = ["a", "b", "c", "d"] as const;
    const r1 = makeRng("p");
    const r2 = makeRng("p");
    const s1 = Array.from({ length: 10 }, () => pick(r1, arr));
    const s2 = Array.from({ length: 10 }, () => pick(r2, arr));
    expect(s1).toEqual(s2);
    for (const x of s1) expect(arr).toContain(x);
  });

  it("randInt stays within the inclusive range", () => {
    const r = makeRng("i");
    for (let i = 0; i < 500; i++) {
      const v = randInt(r, 3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("chance(0) is never true and chance(1) is always true", () => {
    const r = makeRng("c");
    for (let i = 0; i < 100; i++) {
      expect(chance(r, 0)).toBe(false);
      expect(chance(r, 1)).toBe(true);
    }
  });

  it("randomSeed returns distinct values", () => {
    expect(randomSeed()).not.toEqual(randomSeed());
  });
});
