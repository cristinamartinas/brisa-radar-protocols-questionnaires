// ---------------------------------------------------------------------------
// Real-art override registry.
//
// The game ships with procedural placeholders for EVERY entity (see
// GameSprite). To replace any placeholder with real artwork:
//
//   1. Drop the file in /public/art/<kind>/, e.g. /public/art/item/flamebrand.png
//   2. Register it below, keyed by `${kind}:${id}` (the same kind/id the
//      Sprite carries), e.g.  "item:Flamebrand": "/art/item/flamebrand.png"
//
// The renderer prefers a registered asset and falls back to the placeholder,
// so art can be added one piece at a time with zero code changes elsewhere.
//
// You can also register a whole KIND fallback (e.g. a generic monster image)
// with the key `${kind}:*`.
// ---------------------------------------------------------------------------

/** Exact overrides: "kind:id" → public asset path. Empty by default. */
export const ART_OVERRIDES: Record<string, string> = {
  // "item:Flamebrand": "/art/item/flamebrand.png",
  // "boss:Embermaw": "/art/boss/embermaw.png",
  // "pet:battle_chicken": "/art/pet/battle-chicken.png",
};

/** Per-kind fallback art: "kind:*" → path. Used when no exact match exists. */
export const KIND_FALLBACKS: Record<string, string> = {
  // "monster": "/art/monster/_default.png",
};

/** Resolve a real-art asset URL for a sprite, or undefined for the placeholder. */
export function resolveArt(kind: string, id: string): string | undefined {
  return ART_OVERRIDES[`${kind}:${id}`] ?? KIND_FALLBACKS[`${kind}:*`];
}
