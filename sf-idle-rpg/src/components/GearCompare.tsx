import type { Attributes } from "@/lib/game";
import { gearDelta } from "@/lib/gearcompare";

// A compact "how does this compare to what I'm wearing" badge for item cards.
// Server-renderable (no hooks): green upgrade / red downgrade / muted sidegrade,
// with the per-stat deltas spelled out beneath.

const ABBR: Record<keyof Attributes, string> = {
  strength: "STR",
  dexterity: "DEX",
  intelligence: "INT",
  constitution: "CON",
  luck: "LCK",
};

export function GearCompare({
  candidate,
  equipped,
  className,
}: {
  candidate: Attributes;
  equipped: Attributes | null | undefined;
  className?: string;
}) {
  const d = gearDelta(candidate, equipped);

  const color =
    d.net > 0 ? "var(--good)" : d.net < 0 ? "var(--bad)" : "var(--muted)";
  const headline = d.emptySlot
    ? "✦ New slot"
    : d.net > 0
      ? `▲ Upgrade +${d.net}`
      : d.net < 0
        ? `▼ Downgrade ${d.net}`
        : "= Sidegrade";

  const changed = d.stats.filter((s) => s.delta !== 0);

  return (
    <div className={`text-[11px] leading-tight ${className ?? ""}`}>
      <span className="font-bold" style={{ color }}>
        {headline}
      </span>
      {!d.emptySlot && changed.length > 0 && (
        <span className="ml-1 text-muted">
          {changed.map((s, i) => (
            <span key={s.key}>
              {i > 0 ? " · " : ""}
              <span style={{ color: s.delta > 0 ? "var(--good)" : "var(--bad)" }}>
                {s.delta > 0 ? "+" : ""}
                {s.delta}
              </span>{" "}
              {ABBR[s.key]}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

export default GearCompare;
