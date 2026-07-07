/**
 * Deterministic, seeded pseudo-random number generator.
 *
 * The shipped slice used ambient `Math.random()` inside combat and reward
 * paths, which means outcomes couldn't be reproduced, audited, replayed, or
 * unit-tested — and a malicious client couldn't be shown a provably-fair
 * result. Every gameplay roll now flows through a `Rng` seeded from a stored
 * value, so a fight/quest/loot roll is a pure function of `(inputs, seed)`.
 *
 * `xmur3` hashes a string seed into 32-bit state; `sfc32` is a fast, well-
 * distributed PRNG. Neither is cryptographic — they don't need to be; the seed
 * is generated with crypto and stored server-side, the client never sees it
 * before resolution.
 */

export type Rng = () => number; // returns a float in [0, 1)

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number): Rng {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Build a deterministic RNG from a string seed. */
export function makeRng(seed: string): Rng {
  const h = xmur3(seed);
  return sfc32(h(), h(), h(), h());
}

/** A fresh, unguessable seed. Uses crypto (not gameplay RNG). */
export function randomSeed(): string {
  return crypto.randomUUID();
}

// -- Small helpers so callers never touch Math.random for gameplay ---------

/** Pick a uniformly random element using the given RNG. */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** True with the given probability (0..1). */
export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}
