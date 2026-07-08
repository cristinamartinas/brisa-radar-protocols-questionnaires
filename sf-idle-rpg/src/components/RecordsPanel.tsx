import { loadCharacter } from "@/lib/data";
import { getClass } from "@/lib/game";
import { loadRecords, type RecordStat, type GoldFlow } from "@/lib/records";

function fmt(n: number): string {
  return n.toLocaleString();
}

function statValue(s: RecordStat): string {
  if (s.display) return s.display;
  const body = fmt(s.value);
  if (!s.unit) return body;
  // Emoji units hug the number; word/symbol units get a thin space.
  return s.unit === "%" ? `${body}%` : `${body} ${s.unit}`;
}

function StatTile({ s }: { s: RecordStat }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <span>{s.emoji}</span>
        <span className="truncate">{s.label}</span>
      </div>
      <div className="mt-1 text-lg font-black tabular-nums">{statValue(s)}</div>
    </div>
  );
}

function GoldFlowRow({ f, accent }: { f: GoldFlow; accent: string }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">
          <span className="mr-1">{f.emoji}</span>
          {f.label}
        </span>
        <span className="shrink-0 font-bold tabular-nums text-gold">
          {fmt(f.amount)}🪙
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, f.pct)}%`, background: accent }}
        />
      </div>
    </li>
  );
}

/**
 * The Hall of Records — a hero's lifetime-stats dashboard. Self-contained
 * server component: loads the current hero, tallies their records, and lays
 * them out as sectioned stat tiles plus a ledger-driven "where the gold came
 * from / went" breakdown. Renders nothing when there's no hero.
 */
export default async function RecordsPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const records = await loadRecords(character.id);
  if (!records) return null;

  const cls = getClass(records.hero.class);
  const { headline, hero } = records;

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-gold">📖 Hall of Records</h3>
          <p className="text-sm text-muted">
            {cls.emoji} {hero.name}&apos;s lifetime ledger — {fmt(hero.daysAdventuring)}{" "}
            {hero.daysAdventuring === 1 ? "day" : "days"} on the road, and every
            deed set down in ink.
          </p>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            📈 Lifetime Gold Earned
          </div>
          <div className="mt-1 text-2xl font-black tabular-nums text-gold">
            {fmt(headline.lifetimeGoldEarned)}🪙
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            📉 Lifetime Gold Spent
          </div>
          <div className="mt-1 text-2xl font-black tabular-nums">
            {fmt(headline.lifetimeGoldSpent)}🪙
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            🌟 Biggest Single Payout
          </div>
          <div className="mt-1 text-2xl font-black tabular-nums text-good">
            {fmt(headline.biggestWindfall)}🪙
          </div>
          {headline.biggestWindfallReason && headline.biggestWindfall > 0 && (
            <div className="mt-0.5 text-xs text-muted">
              {headline.biggestWindfallReason.emoji}{" "}
              {headline.biggestWindfallReason.label}
            </div>
          )}
        </div>
      </div>

      {/* Themed stat sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        {records.sections.map((section) => (
          <div key={section.key} className="rounded-lg bg-surface-2 p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg">{section.emoji}</span>
              <h4 className="font-black">{section.title}</h4>
            </div>
            <p className="mb-3 text-xs text-muted">{section.blurb}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {section.stats.map((s) => (
                <StatTile key={s.key} s={s} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Gold flow, straight from the ledger */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-surface-2 p-4">
          <h4 className="mb-1 flex items-center gap-2 font-black">
            <span className="text-lg">💰</span> Where the Gold Came From
          </h4>
          <p className="mb-3 text-xs text-muted">
            Every coin, traced back to its source.
          </p>
          {records.goldBySource.length === 0 ? (
            <p className="text-sm text-muted">No fortune earned yet — to the tavern!</p>
          ) : (
            <ul className="space-y-2.5">
              {records.goldBySource.map((f) => (
                <GoldFlowRow key={f.reason} f={f} accent="var(--gold)" />
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg bg-surface-2 p-4">
          <h4 className="mb-1 flex items-center gap-2 font-black">
            <span className="text-lg">🧾</span> Where the Gold Went
          </h4>
          <p className="mb-3 text-xs text-muted">
            A spendthrift&apos;s honest accounting.
          </p>
          {records.goldBySink.length === 0 ? (
            <p className="text-sm text-muted">
              Not a coin spent. A thrifty hero indeed.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {records.goldBySink.map((f) => (
                <GoldFlowRow key={f.reason} f={f} accent="var(--accent)" />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
