// A single attribute row: icon + label, base value with an optional gear bonus.
// The class's primary attribute is highlighted. Pattern used by the Character
// screen's StatBlock (and reusable anywhere attributes are listed).

export function StatRow({
  icon,
  label,
  base,
  bonus = 0,
  primary = false,
}: {
  icon: string;
  label: string;
  base: number;
  bonus?: number;
  primary?: boolean;
}) {
  return (
    <li
      className="flex items-center justify-between rounded-lg px-3 py-2"
      style={{ background: primary ? "var(--surface-2)" : "transparent" }}
    >
      <span className="flex items-center gap-2.5 text-sm">
        <span className="w-5 text-center">{icon}</span>
        <span>{label}</span>
        {primary && (
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
            primary
          </span>
        )}
      </span>
      <span className="font-black tabular-nums">
        {base + bonus}
        {bonus > 0 && <span className="ml-1 text-xs font-semibold text-gold">+{bonus}</span>}
      </span>
    </li>
  );
}

export default StatRow;
