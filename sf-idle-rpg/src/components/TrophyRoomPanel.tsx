import { loadCharacter } from "@/lib/data";
import {
  loadTrophyRoom,
  type TrophySection,
  type TrophyHighlight,
} from "@/lib/trophyroom";

/** A small SVG progress ring around a collection's emoji. */
function TrophyRing({ section }: { section: TrophySection }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, section.pct) / 100) * circumference;
  const complete = section.total > 0 && section.earned >= section.total;

  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-surface p-4 text-center">
      <div className="relative h-[68px] w-[68px]">
        <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
          <circle
            cx="34"
            cy="34"
            r={radius}
            fill="none"
            strokeWidth="6"
            stroke="var(--surface-2)"
          />
          <circle
            cx="34"
            cy="34"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            stroke={complete ? "var(--good)" : "var(--gold)"}
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl leading-none">
          {section.emoji}
        </span>
      </div>

      <div className="mt-3 font-bold leading-tight">{section.label}</div>
      <div className="mt-0.5 text-sm font-black tabular-nums text-gold">
        {section.earned.toLocaleString()}
        <span className="text-muted"> / {section.total.toLocaleString()}</span>
      </div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {complete ? (
          <span className="text-good">✦ Complete</span>
        ) : (
          `${section.pct}%`
        )}
      </div>
      <p className="mt-2 text-xs leading-snug text-muted">{section.caption}</p>
    </div>
  );
}

/** A headline stat displayed in the marquee above the cabinet. */
function Headline({ highlight }: { highlight: TrophyHighlight }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3">
      <span className="text-2xl leading-none">{highlight.emoji}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {highlight.label}
        </div>
        <div className="truncate font-black leading-tight text-gold">
          {highlight.value}
        </div>
      </div>
    </div>
  );
}

/**
 * The Trophy Room — the "look at everything I have" capstone. Self-contained
 * read-only server component: loads the hero, aggregates every collection into
 * a single showcase, and lays it out as a marquee of headline numbers over a
 * cabinet of progress-ring trophy tiles. Writes nothing.
 */
export default async function TrophyRoomPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const { sections, highlights, totalEarned, totalPossible, overallPct } =
    await loadTrophyRoom(character.id);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-4">
        <h3 className="font-black text-gold">🏆 The Trophy Room</h3>
        <p className="text-sm text-muted">
          Every title, trinket, critter and conquest {character.name} has to
          their name — dust it off and admire the collection. {" "}
          <span className="text-gold">{totalEarned.toLocaleString()}</span> of{" "}
          {totalPossible.toLocaleString()} treasures secured (
          <span className="text-gold">{overallPct}%</span>).
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Headline marquee */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {highlights.map((h) => (
          <Headline key={h.key} highlight={h} />
        ))}
      </div>

      {/* The cabinet */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {sections.map((s) => (
          <TrophyRing key={s.key} section={s} />
        ))}
      </div>
    </section>
  );
}
