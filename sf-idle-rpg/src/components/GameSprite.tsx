// ---------------------------------------------------------------------------
// <GameSprite/> — the single renderer for every drawable thing in the game.
//
// Given a Sprite descriptor it draws a framed, themed icon: a procedural SVG
// plaque/medallion/shield tinted by rarity/class, with the content's motif
// (an emoji today, real art when registered) at its heart. Deterministic
// per-instance flourishes (seeded from the entity id) make two Common swords
// look subtly different — every entity gets its own image.
//
// No hooks, no interactivity → this is a plain (server-renderable) component,
// so lists of dozens of sprites cost zero client JS.
// ---------------------------------------------------------------------------

import type { Sprite, FrameShape } from "@/lib/art/sprite";
import { resolveArt } from "@/lib/art/overrides";
import { MOTIFS, ItemMotif } from "@/lib/art/motifs";

// --- small deterministic PRNG (seeded flourishes; no Math.random) -----------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- color helpers ----------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(hex: string, target: string, amt: number): string {
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(target);
  return rgbToHex(r1 + (r2 - r1) * amt, g1 + (g2 - g1) * amt, b1 + (b2 - b1) * amt);
}
const lighten = (hex: string, amt: number) => mix(hex, "#ffffff", amt);
const darken = (hex: string, amt: number) => mix(hex, "#000000", amt);

// --- frame geometry ---------------------------------------------------------

const SHIELD_PATH =
  "M50 6 L90 20 L90 50 Q90 82 50 96 Q10 82 10 50 L10 20 Z";

function framePath(shape: FrameShape, inset: number): {
  el: "rect" | "circle" | "path";
  attrs: Record<string, number | string>;
} {
  if (shape === "round") {
    return { el: "circle", attrs: { cx: 50, cy: 50, r: 50 - inset } };
  }
  if (shape === "shield") {
    return { el: "path", attrs: { d: SHIELD_PATH } };
  }
  return {
    el: "rect",
    attrs: { x: inset, y: inset, width: 100 - inset * 2, height: 100 - inset * 2, rx: 16, ry: 16 },
  };
}

// --- component --------------------------------------------------------------

export interface GameSpriteProps {
  sprite: Sprite;
  /** Rendered box size in px. Default 44. */
  size?: number;
  /** Accessible label; defaults to a generic per-kind description. */
  title?: string;
  className?: string;
}

export function GameSprite({ sprite, size = 44, title, className }: GameSpriteProps) {
  const { glyph, tint, accent, shape, ring, glow, seed, kind, id, badge } = sprite;
  const rand = mulberry32(seed);
  const override = resolveArt(kind, id);
  // Prefer real registered art; else a drawn vector motif; else the emoji glyph.
  const motifKey = sprite.motif && MOTIFS[sprite.motif] ? sprite.motif : null;
  const drawMotif = !override && !!motifKey;
  const motifColors = {
    steel: "#e9e4d6",
    ink: "#160f08",
    accent: lighten(tint, 0.08),
    glint: lighten(tint, 0.35),
  };

  // A stable, unique gradient id namespace for this sprite instance.
  const uid = `s${(seed % 0xffffff).toString(36)}`;

  const frameStroke = lighten(tint, 0.15);
  const frameStrokeDark = darken(tint, 0.35);
  const glowBlur = 2 + glow * 5;

  const inset = 5;
  const { el, attrs } = framePath(shape, inset);
  const clipShape = framePath(shape, inset + 3);

  // Seeded decorative pips around the frame (3–6), skipped for currency coins.
  const pipCount = ring === "none" ? 0 : 3 + Math.floor(rand() * 4);
  const pips = Array.from({ length: pipCount }, (_, i) => {
    const ang = (i / pipCount) * Math.PI * 2 + rand() * 0.5;
    const rr = shape === "round" ? 40 : 36;
    return { x: 50 + Math.cos(ang) * rr, y: 50 + Math.sin(ang) * rr, r: 1.1 + rand() * 1.3 };
  });

  // Seeded faint background sigil rotation for per-instance texture.
  const sigilRot = Math.floor(rand() * 360);
  const sigilSides = 3 + Math.floor(rand() * 4);
  const sigil = Array.from({ length: sigilSides }, (_, i) => {
    const ang = (i / sigilSides) * Math.PI * 2;
    return `${(50 + Math.cos(ang) * 30).toFixed(1)},${(50 + Math.sin(ang) * 30).toFixed(1)}`;
  }).join(" ");

  const glyphSize = Math.round(size * (shape === "shield" ? 0.44 : 0.5));

  const shapeEl = (fill: string, extra: Record<string, number | string> = {}) => {
    const p = { ...attrs, ...extra, fill };
    if (el === "circle") return <circle {...(p as Record<string, number | string>)} />;
    if (el === "path") return <path {...(p as Record<string, number | string>)} />;
    return <rect {...(p as Record<string, number | string>)} />;
  };
  const clipEl = () => {
    const p = clipShape.attrs;
    if (clipShape.el === "circle") return <circle {...p} />;
    if (clipShape.el === "path") return <path {...p} />;
    return <rect {...p} />;
  };

  return (
    <span
      className={className}
      role="img"
      aria-label={title ?? `${kind} icon`}
      title={title}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flex: "none",
        lineHeight: 0,
        verticalAlign: "middle",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`${uid}-bg`} cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor={mix(tint, "#3a2817", 0.55)} />
            <stop offset="60%" stopColor="#2b1d12" />
            <stop offset="100%" stopColor="#160f08" />
          </radialGradient>
          <linearGradient id={`${uid}-frame`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={frameStroke} />
            <stop offset="50%" stopColor={tint} />
            <stop offset="100%" stopColor={frameStrokeDark} />
          </linearGradient>
          {glow > 0.25 && (
            <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation={glowBlur} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
          <clipPath id={`${uid}-clip`}>{clipEl()}</clipPath>
        </defs>

        {/* outer glow halo for shiny things */}
        {glow > 0.25 && shapeEl(tint, { filter: `url(#${uid}-glow)`, opacity: 0.35 })}

        {/* base fill */}
        {shapeEl(`url(#${uid}-bg)`)}

        {/* faint seeded sigil, clipped inside the frame */}
        <g clipPath={`url(#${uid}-clip)`}>
          <polygon
            points={sigil}
            fill="none"
            stroke={lighten(tint, 0.2)}
            strokeWidth={0.8}
            opacity={0.12}
            transform={`rotate(${sigilRot} 50 50)`}
          />
          <polygon
            points={sigil}
            fill="none"
            stroke={lighten(tint, 0.2)}
            strokeWidth={0.6}
            opacity={0.1}
            transform={`rotate(${sigilRot + 30} 50 50) scale(0.6) translate(33 33)`}
          />
        </g>

        {/* metallic frame border */}
        {shapeEl("none", { stroke: `url(#${uid}-frame)`, strokeWidth: 4.5 })}
        {/* inner highlight line */}
        {clipShape.el === "circle" ? (
          <circle {...clipShape.attrs} fill="none" stroke={lighten(tint, 0.35)} strokeWidth={0.8} opacity={0.5} />
        ) : clipShape.el === "path" ? (
          <path {...clipShape.attrs} fill="none" stroke={lighten(tint, 0.35)} strokeWidth={0.8} opacity={0.5} />
        ) : (
          <rect {...clipShape.attrs} fill="none" stroke={lighten(tint, 0.35)} strokeWidth={0.8} opacity={0.5} />
        )}

        {/* danger spikes for bosses */}
        {ring === "danger" &&
          Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x1 = 50 + Math.cos(a) * 46;
            const y1 = 50 + Math.sin(a) * 46;
            const x2 = 50 + Math.cos(a) * 52;
            const y2 = 50 + Math.sin(a) * 52;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth={2} strokeLinecap="round" opacity={0.85} />
            );
          })}

        {/* ornate ring: a second thin outer ring + corner gems */}
        {ring === "ornate" &&
          (shape === "round" ? (
            <circle cx={50} cy={50} r={48} fill="none" stroke={accent} strokeWidth={0.9} opacity={0.6} />
          ) : null)}

        {/* seeded pips */}
        {pips.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={lighten(accent, 0.1)} opacity={0.7} />
        ))}

        {/* drawn vector motif (equipment) — scales with the frame */}
        {drawMotif && <ItemMotif motif={motifKey} colors={motifColors} />}
      </svg>

      {/* the motif: real art if registered, else the emoji glyph */}
      {override ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={override}
          alt={title ?? `${kind} art`}
          width={Math.round(size * 0.82)}
          height={Math.round(size * 0.82)}
          style={{
            position: "relative",
            width: Math.round(size * 0.82),
            height: Math.round(size * 0.82),
            objectFit: "contain",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
          }}
        />
      ) : drawMotif ? null : (
        <span
          aria-hidden="true"
          style={{
            position: "relative",
            fontSize: glyphSize,
            lineHeight: 1,
            transform: shape === "shield" ? "translateY(-4%)" : undefined,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))",
          }}
        >
          {glyph}
        </span>
      )}

      {/* corner rarity/level badge */}
      {badge && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            minWidth: Math.max(12, size * 0.34),
            height: Math.max(12, size * 0.34),
            padding: "0 3px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.max(8, size * 0.24),
            fontWeight: 900,
            color: darken(tint, 0.55),
            background: `linear-gradient(180deg, ${lighten(tint, 0.25)}, ${tint})`,
            border: `1px solid ${darken(tint, 0.3)}`,
            borderRadius: 999,
            boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
            lineHeight: 1,
          }}
        >
          {badge}
        </span>
      )}
    </span>
  );
}

export default GameSprite;
