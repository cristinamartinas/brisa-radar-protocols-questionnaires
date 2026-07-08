import { loadCharacter } from "@/lib/data";
import { loadRankings, type RankingCategory, type RankingRow } from "@/lib/rankings";
import { getClass } from "@/lib/game";

/** Medal for the podium, plain numeral thereafter. */
function placeMark(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}.`;
}

/** Render a category's score the way that category likes to be read. */
function formatValue(key: string, value: number, unit: string): string {
  switch (key) {
    case "level":
      return `Lv ${value}`;
    case "tower":
      return `Floor ${value}`;
    case "gold":
    case "fortune":
      return `${value.toLocaleString()} ${unit}`;
    default:
      return `${value.toLocaleString()} ${unit}`;
  }
}

function RankRow({ row, categoryKey, unit }: {
  row: RankingRow;
  categoryKey: string;
  unit: string;
}) {
  const cls = getClass(row.class);
  return (
    <li
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
      style={
        row.isMe
          ? { background: "var(--surface-2)", outline: "1px solid var(--gold)" }
          : undefined
      }
    >
      <span className="w-6 shrink-0 text-center font-black text-muted">
        {placeMark(row.rank)}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span title={cls.label}>{cls.emoji}</span> {row.name}
        {row.isMe && <span className="ml-1 text-xs text-gold">(you)</span>}
      </span>
      <span className="shrink-0 font-bold tabular-nums text-gold">
        {formatValue(categoryKey, row.value, unit)}
      </span>
    </li>
  );
}

function RankingCard({ category }: { category: RankingCategory }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl">{category.emoji}</span>
        <h4 className="font-black text-gold">{category.title}</h4>
      </div>
      <p className="mb-3 text-xs italic text-muted">{category.blurb}</p>
      {category.rows.length === 0 ? (
        <p className="rounded-md bg-surface-2 px-3 py-4 text-center text-xs text-muted">
          No champions yet — this hall awaits its first legend. 🕯️
        </p>
      ) : (
        <ol className="space-y-1">
          {category.rows.map((row) => (
            <RankRow
              key={row.characterId}
              row={row}
              categoryKey={category.key}
              unit={category.unit}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * The Rankings Hub. Self-contained server component: loads the current hero,
 * computes every leaderboard hall, and lays them out as a wall of ranked
 * cards with the hero's own placements lit up in gold.
 */
export default async function RankingsPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const { categories } = await loadRankings(character.id);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-4">
        <h3 className="font-black text-gold">🏛️ The Rankings Hub</h3>
        <p className="text-sm text-muted">
          Six halls of legend. Level and lucre, arena and tower — find your name,
          then climb until it sits at the top.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <RankingCard key={category.key} category={category} />
        ))}
      </div>
    </section>
  );
}
