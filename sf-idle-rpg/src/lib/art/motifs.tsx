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

// --- class crests -----------------------------------------------------------

const warriorCrest: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M30 30 L38 30 L70 66 L66 74 Z" fill={c.steel} />
    <path d="M70 30 L62 30 L30 66 L34 74 Z" fill={c.steel} />
    <circle cx={50} cy={52} r={4} fill={c.accent} />
  </g>
);

const mageCrest: MotifFn = (c) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 26 : 11;
    return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
  return (
    <g {...stroke(c)}>
      <polygon points={pts} fill={c.accent} />
      <circle cx={50} cy={50} r={4} fill={c.glint} stroke="none" />
      <circle cx={26} cy={30} r={2.2} fill={c.glint} stroke="none" />
      <circle cx={74} cy={34} r={1.8} fill={c.glint} stroke="none" />
    </g>
  );
};

const scoutCrest: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M36 20 Q72 50 36 80" fill="none" stroke={c.steel} strokeWidth={4} />
    <line x1={36} y1={20} x2={36} y2={80} stroke={c.accent} strokeWidth={1.8} />
    <line x1={30} y1={50} x2={74} y2={50} stroke={c.accent} strokeWidth={2.4} />
    <path d="M74 50 L67 45 M74 50 L67 55" fill="none" stroke={c.accent} strokeWidth={2.4} />
    <path d="M30 50 L35 47 M30 50 L35 53" fill="none" stroke={c.accent} strokeWidth={2.2} />
  </g>
);

// --- monsters ---------------------------------------------------------------

const skull: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M28 44 Q28 22 50 22 Q72 22 72 44 Q72 58 64 62 L64 70 L36 70 L36 62 Q28 58 28 44 Z" fill={c.steel} />
    <circle cx={40} cy={46} r={6} fill={c.ink} stroke="none" />
    <circle cx={60} cy={46} r={6} fill={c.ink} stroke="none" />
    <path d="M50 52 L46 60 L54 60 Z" fill={c.ink} stroke="none" />
    <path d="M40 70 L40 76 M50 70 L50 77 M60 70 L60 76" stroke={c.ink} strokeWidth={2} />
  </g>
);

const ghost: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M28 54 Q28 24 50 24 Q72 24 72 54 L72 78 L64 70 L56 78 L50 70 L44 78 L36 70 L28 78 Z" fill={c.steel} />
    <circle cx={42} cy={48} r={4.5} fill={c.ink} stroke="none" />
    <circle cx={58} cy={48} r={4.5} fill={c.ink} stroke="none" />
  </g>
);

const dragon: MotifFn = (c) => (
  <g {...stroke(c)}>
    {/* horned dragon head in profile, snout to the right */}
    <path d="M30 40 Q34 24 46 30 L44 40 Q60 34 74 46 Q78 50 72 54 L58 54 Q60 64 48 66 Q34 66 30 54 Q26 48 30 40 Z" fill={c.steel} />
    <path d="M40 30 L36 18 L46 28 Z" fill={c.accent} />
    <circle cx={44} cy={44} r={3} fill={c.ink} stroke="none" />
    <path d="M66 50 L74 49 M62 55 L70 57" stroke={c.ink} strokeWidth={1.6} />
  </g>
);

const demon: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M30 40 Q30 26 50 26 Q70 26 70 40 Q70 60 50 74 Q30 60 30 40 Z" fill={c.steel} />
    <path d="M30 38 Q20 22 24 18 Q34 24 38 34 Z" fill={c.accent} />
    <path d="M70 38 Q80 22 76 18 Q66 24 62 34 Z" fill={c.accent} />
    <path d="M40 44 L47 48 L40 50 Z" fill={c.ink} stroke="none" />
    <path d="M60 44 L53 48 L60 50 Z" fill={c.ink} stroke="none" />
    <path d="M42 58 L46 62 L50 58 L54 62 L58 58" fill="none" stroke={c.ink} strokeWidth={2} />
  </g>
);

const beast: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M28 34 L38 44 Q50 38 62 44 L72 34 L70 52 Q66 70 50 72 Q34 70 30 52 Z" fill={c.steel} />
    <circle cx={42} cy={50} r={3.5} fill={c.ink} stroke="none" />
    <circle cx={58} cy={50} r={3.5} fill={c.ink} stroke="none" />
    <path d="M44 60 L48 64 L44 66 Z M56 60 L52 64 L56 66 Z" fill={c.glint} stroke="none" />
    <path d="M48 62 L50 68 L52 62" fill="none" stroke={c.ink} strokeWidth={1.6} />
  </g>
);

const slime: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M26 72 Q22 40 50 34 Q78 40 74 72 Q60 66 50 72 Q40 78 26 72 Z" fill={c.accent} />
    <circle cx={42} cy={54} r={4} fill={c.ink} stroke="none" />
    <circle cx={60} cy={54} r={4} fill={c.ink} stroke="none" />
    <circle cx={64} cy={44} r={3} fill={c.glint} stroke="none" />
  </g>
);

const golem: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M32 34 L68 34 L72 68 L60 76 L40 76 L28 68 Z" fill={c.steel} />
    <path d="M32 48 L68 48 M50 34 L50 48 M44 48 L40 76 M56 48 L60 76" stroke={c.ink} strokeWidth={1.6} />
    <rect x={38} y={38} width={7} height={5} fill={c.accent} stroke="none" />
    <rect x={55} y={38} width={7} height={5} fill={c.accent} stroke="none" />
  </g>
);

const goblin: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M22 40 L40 46 Q50 38 60 46 L78 40 L70 52 Q72 68 50 72 Q28 68 30 52 Z" fill={c.accent} />
    <circle cx={43} cy={52} r={3.2} fill={c.ink} stroke="none" />
    <circle cx={57} cy={52} r={3.2} fill={c.ink} stroke="none" />
    <path d="M50 58 L47 64 L53 64 Z" fill={c.steel} stroke="none" />
    <path d="M46 66 L48 70" stroke={c.steel} strokeWidth={2} />
  </g>
);

const knight: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M34 34 Q34 26 50 26 Q66 26 66 34 L66 58 Q66 72 50 76 Q34 72 34 58 Z" fill={c.steel} />
    <rect x={38} y={44} width={24} height={5} rx={1} fill={c.ink} stroke="none" />
    <rect x={47} y={40} width={6} height={20} rx={1} fill={c.ink} stroke="none" />
    <path d="M50 26 Q52 16 60 14 Q56 22 54 28 Z" fill={c.accent} />
  </g>
);

const fiend: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M30 44 Q30 28 50 28 Q70 28 70 44 Q70 64 50 74 Q30 64 30 44 Z" fill={c.steel} />
    <path d="M42 46 L48 50 L42 52 Z M58 46 L52 50 L58 52 Z" fill={c.ink} stroke="none" />
    <path d="M42 60 L46 56 L50 60 L54 56 L58 60 L54 64 L50 60 L46 64 Z" fill={c.accent} stroke="none" />
  </g>
);

// --- currencies -------------------------------------------------------------

const coin: MotifFn = (c) => (
  <g {...stroke(c)}>
    <circle cx={50} cy={50} r={26} fill={c.accent} />
    <circle cx={50} cy={50} r={20} fill="none" stroke={c.glint} strokeWidth={2} />
    <path d="M50 38 L50 62 M44 44 L56 44 M43 56 L57 56" stroke={c.ink} strokeWidth={2.4} />
  </g>
);

const mushroom: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M24 50 Q24 26 50 26 Q76 26 76 50 Q60 56 50 54 Q40 56 24 50 Z" fill={c.accent} />
    <circle cx={40} cy={40} r={4} fill={c.glint} stroke="none" />
    <circle cx={58} cy={38} r={3} fill={c.glint} stroke="none" />
    <path d="M42 54 Q44 74 42 78 L58 78 Q56 74 58 54 Z" fill={c.steel} />
  </g>
);

const crystal: MotifFn = (c) => (
  <g {...stroke(c)}>
    <path d="M50 22 L66 42 L50 78 L34 42 Z" fill={c.accent} />
    <path d="M34 42 L66 42 M50 22 L50 78 M42 32 L58 32" stroke={c.glint} strokeWidth={1.6} />
  </g>
);

// --- registry + picker ------------------------------------------------------

export const MOTIFS: Record<string, MotifFn> = {
  sword, dagger, axe, mace, cudgel, staff, bow,
  shield, robe, chain, amulet, ring,
  warriorCrest, mageCrest, scoutCrest,
  skull, ghost, dragon, demon, beast, slime, golem, goblin, knight, fiend,
  coin, mushroom, crystal,
};

/** Class crest motif for a hero medallion. */
export function pickClassMotif(cls: string): string | null {
  switch ((cls ?? "").toUpperCase()) {
    case "WARRIOR": return "warriorCrest";
    case "MAGE": return "mageCrest";
    case "SCOUT": return "scoutCrest";
    default: return null;
  }
}

/** Monster archetype from a name and/or its stand-in emoji glyph. */
export function pickMonsterMotif(name = "", glyph = ""): string {
  const g = glyph;
  if (/💀|☠️|🦴/.test(g)) return "skull";
  if (/👻|😭/.test(g)) return "ghost";
  if (/🐲|🐉|🦖|🔥|🌋/.test(g)) return "dragon";
  if (/👹|👺|😈/.test(g)) return "demon";
  if (/🗿|⚱️/.test(g)) return "golem";
  if (/🐗|🦡|🐺|🦁|🐻/.test(g)) return "beast";
  if (/🟢|🫧|🦠/.test(g)) return "slime";

  const n = name.toLowerCase();
  if (/(skeleton|bone|lich|rattle|crypt|skull|dead)/.test(n)) return "skull";
  if (/(wraith|weeping|ghost|spirit|shade|phantom)/.test(n)) return "ghost";
  if (/(dragon|drake|wyrm|ember|molten|cinder|ashen|ash|flame|scale)/.test(n)) return "dragon";
  if (/(demon|fiend|menace|cruel|devil|hell|dread)/.test(n)) return "demon";
  if (/(goblin|warboss|snaggle|grub|fang|biter|mud|nix)/.test(n)) return "goblin";
  if (/(badger|boar|beast|hound|wolf|rat|maw)/.test(n)) return "beast";
  if (/(golem|warden|stone|marble|colossus|rock)/.test(n)) return "golem";
  if (/(ooze|slime|blob|jelly)/.test(n)) return "slime";
  return "fiend";
}

/**
 * Bestiary foe motif — category-aware so themed foes get the right archetype
 * while the joke "Arena Regulars" keep their expressive emoji (returns null).
 */
export function pickFoeMotif(name = "", glyph = "", category = ""): string | null {
  const cat = category.toLowerCase();
  const n = name.toLowerCase();
  if (cat.includes("arena")) return null; // Brenda, Gary, the Badger — keep emoji
  if (cat.includes("crypt")) {
    if (/wraith|weeping|spirit|ghost|shade/.test(n)) return "ghost";
    if (/countess|morlyn|vampire|blood/.test(n)) return "demon";
    return "skull";
  }
  if (cat.includes("warren") || cat.includes("goblin")) {
    if (/mudfang|boar|badger|beast|hog/.test(n)) return "beast";
    return "goblin";
  }
  if (cat.includes("keep") || cat.includes("dragon")) {
    if (/knight|cinderbane|ashen|sir /.test(n)) return "knight";
    if (/warden|molten|golem|stone|marble/.test(n)) return "golem";
    return "dragon";
  }
  // Tower / World Boss / anything else → best guess from name + emoji.
  return pickMonsterMotif(name, glyph);
}

/** Currency motif. */
export function pickCurrencyMotif(kind: string): string {
  switch (kind) {
    case "GOLD": return "coin";
    case "MUSHROOMS": return "mushroom";
    case "DUST": return "crystal";
    default: return "coin";
  }
}

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
