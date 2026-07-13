import { describe, it, expect } from "vitest";
import { restReward, REST_MAX_HOURS, REST_MIN_MS } from "@/lib/rest";

const H = 3_600_000;

describe("restReward", () => {
  it("is not ready for a quick refresh", () => {
    expect(restReward(1, REST_MIN_MS - 1).ready).toBe(false);
    expect(restReward(1, 0).ready).toBe(false);
  });

  it("banks gold + XP scaled by level and time once past the threshold", () => {
    const r = restReward(1, 1 * H); // 1 hour at level 1
    expect(r.ready).toBe(true);
    expect(r.gold).toBe(10); // floor(1 * (8 + 2))
    expect(r.xp).toBe(13); // floor(1 * (10 + 3))
    // higher level earns more
    expect(restReward(10, 1 * H).gold).toBeGreaterThan(r.gold);
  });

  it("stops accruing after the cap", () => {
    const capped = restReward(1, 100 * H);
    const atCap = restReward(1, REST_MAX_HOURS * H);
    expect(capped.gold).toBe(atCap.gold);
    expect(capped.hours).toBe(REST_MAX_HOURS);
  });
});
