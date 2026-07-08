// ---------------------------------------------------------------------------
// Procedural vector motifs — real drawn icons (not emoji) for equipment.
//
// Each item's name implies a shape: a "Gleaming Cudgel of the Fox" is a club, a
// "Fine Bow" is a bow, "Plate" is a shield. pickItemMotif() maps the name+slot
// to one of the motif keys below; <ItemMotif/> draws it as a flat, game-style
// SVG silhouette (steel body, rarity-tinted gems/accents) sized to sit inside a
// GameSprite frame. These are drawn art, so they read as a custom icon set.
// ---------------------------------------------------------------------------

export type MotifColors = {
  /** Bright metal/body fill. */
  steel: string;
  /** Dark outline. */
  ink: string;
  /** Rarity-tinted accent (gems, orbs, wrappings). */
  accent: string;
  /** A lighter tint for highlights. */
  glint: string;
};

type MotifFn = (c: MotifColors) => React.ReactNode;

const stroke = (c: MotifColors, w = 2.4) => ({
  stroke: c.ink,
  strokeWidth: w,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
});

// --- weapons ----------------------------------------------------------------

const sword: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M50 12 L56 26 L54 62 L46 62 L44 26 Z" fill={c.steel} />
    <line x1={50} y1={20} x2={50} y2={58} stroke={c.glint} strokeWidth={1.4} />
    <path d="M36 62 L64 62 L60 68 L40 68 Z" fill={c.accent} />
    <rect x={47} y={68} width={6} height={16} rx={2} fill={c.accent} />
    <circle cx={50} cy={87} r={4.5} fill={c.steel} />
  </g>
);

const dagger: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M50 22 L55 34 L53 56 L47 56 L45 34 Z" fill={c.steel} />
    <path d="M40 56 L60 56 L57 61 L43 61 Z" fill={c.accent} />
    <rect x={47} y={61} width={6} height={13} rx={2} fill={c.accent} />
    <circle cx={50} cy={77} r={3.6} fill={c.steel} />
  </g>
);

const axe: MotifFn = (c) => (
  <g {...stroke(c)}>
    <rect x={47} y={16} width={6} height={70} rx={3} fill={c.accent} />
    <path d="M50 24 Q78 24 76 44 Q60 42 50 40 Z" fill={c.steel} />
    <path d="M50 24 Q22 24 24 44 Q40 42 50 40 Z" fill={c.steel} />
  </g>
);

const mace: MotifFn = (c) => (
  <g {...stroke(c)}>
    <rect x={47} y={44} width={6} height={40} rx={3} fill={c.accent} />
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <line
          key={i}
          x1={50 + Math.cos(a) * 12}
          y1={32 + Math.sin(a) * 12}
          x2={50 + Math.cos(a) * 18}
          y2={32 + Math.sin(a) * 18}
          stroke={c.steel}
          strokeWidth={3}
        />
      );
    })}
    <circle cx={50} cy={32} r={12} fill={c.steel} />
  </g>
);

const cudgel: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M43 82 L47 40 Q50 30 53 40 L57 82 Z" fill={c.steel} />
    <circle cx={46} cy={44} r={2.4} fill={c.ink} />
    <circle cx={54} cy={52} r={2.4} fill={c.ink} />
    <circle cx={47} cy={62} r={2.4} fill={c.ink} />
    <rect x={45} y={80} width={10} height={6} rx={2} fill={c.accent} />
  </g>
);

const staff: MotifFn = (c) => (
  <g {...stroke(c)}>
    <rect x={48} y={30} width={4} height={56} rx={2} fill={c.accent} />
    <circle cx={50} cy={26} r={11} fill={c.steel} />
    <circle cx={50} cy={26} r={5} fill={c.accent} />
  </g>
);

const bow: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M40 14 Q70 50 40 86" fill="none" stroke={c.steel} strokeWidth={4} />
    <line x1={40} y1={14} x2={40} y2={86} stroke={c.glint} strokeWidth={1.6} />
    <line x1={40} y1={50} x2={72} y2={50} stroke={c.accent} strokeWidth={2.4} />
    <path d="M72 50 L66 46 M72 50 L66 54" fill="none" stroke={c.accent} strokeWidth={2.4} />
  </g>
);

// --- armor ------------------------------------------------------------------

const shield: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M50 16 L76 26 L76 50 Q76 72 50 84 Q24 72 24 50 L24 26 Z" fill={c.steel} />
    <path d="M50 16 L50 84" stroke={c.ink} strokeWidth={2} />
    <path d="M24 40 L76 40" stroke={c.ink} strokeWidth={2} />
    <circle cx={50} cy={40} r={5} fill={c.accent} />
  </g>
);

const robe: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M36 30 Q50 22 64 30 L70 46 L61 50 L63 84 L37 84 L39 50 L30 46 Z" fill={c.steel} />
    <path d="M50 26 L50 84" stroke={c.accent} strokeWidth={3} />
    <circle cx={50} cy={40} r={3} fill={c.accent} />
  </g>
);

const chain: MotifFn = (c) => (
  <g {...stroke(c, 2)}>
    <path d="M36 30 Q50 24 64 30 L68 48 L60 52 L62 82 L38 82 L40 52 L32 48 Z" fill={c.steel} />
    {[46, 56, 66, 76].map((y) =>
      [40, 48, 56].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2.2} fill={c.glint} stroke="none" />),
    )}
  </g>
);

// --- amulets ----------------------------------------------------------------

const amulet: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M30 30 Q50 52 70 30" fill="none" stroke={c.accent} strokeWidth={3} />
    <path d="M50 48 L61 60 L50 76 L39 60 Z" fill={c.steel} />
    <path d="M50 54 L56 60 L50 70 L44 60 Z" fill={c.accent} />
  </g>
);

const ring: MotifFn = (c) => (
  <g {...stroke(c)}>
    <circle cx={50} cy={58} r={17} fill="none" stroke={c.steel} strokeWidth={7} />
    <path d="M50 30 L59 40 L50 50 L41 40 Z" fill={c.accent} />
  </g>
);

// --- registry + picker ------------------------------------------------------

export const MOTIFS: Record<string, MotifFn> = {
  sword, dagger, axe, mace, cudgel, staff, bow,
  shield, robe, chain, amulet, ring,
};

/** Map an item's name + slot to a motif key (or null to fall back to a glyph). */
export function pickItemMotif(name: string, slot: string): string | null {
  const n = name.toLowerCase();
  const s = slot?.toUpperCase();
  if (s === "WEAPON") {
    if (n.includes("dagger")) return "dagger";
    if (n.includes("axe")) return "axe";
    if (n.includes("mace")) return "mace";
    if (n.includes("cudgel") || n.includes("club")) return "cudgel";
    if (n.includes("staff") || n.includes("wand") || n.includes("rod")) return "staff";
    if (n.includes("bow")) return "bow";
    return "sword";
  }
  if (s === "ARMOR") {
    if (n.includes("robe")) return "robe";
    if (n.includes("chain") || n.includes("mail")) return "chain";
    return "shield";
  }
  if (s === "AMULET") {
    if (n.includes("ring")) return "ring";
    return "amulet";
  }
  return null;
}

/** Draw a motif's SVG children with the given colors. */
export function ItemMotif({ motif, colors }: { motif: string; colors: MotifColors }) {
  const fn = MOTIFS[motif];
  return fn ? <>{fn(colors)}</> : null;
}
