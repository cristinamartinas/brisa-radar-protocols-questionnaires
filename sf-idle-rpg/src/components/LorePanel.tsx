import { loadCharacter } from "@/lib/data";
import { loadLore, type LoreChapterView, type LoreEntryView } from "@/lib/lore";

/** A single leaf of the Codex — an illuminated page, or a sealed one. */
function LoreLeaf({ entry }: { entry: LoreEntryView }) {
  if (!entry.unlocked) {
    return (
      <div className="rounded-lg border border-border bg-surface-2 p-4 opacity-60">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none grayscale">🔒</span>
          <h4 className="truncate font-bold leading-tight text-muted">
            {entry.title}
          </h4>
        </div>
        <p className="mt-2 text-xs italic leading-snug text-muted">
          This page is still sealed. {entry.hint}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none text-gold">✦</span>
        <h4 className="font-bold leading-tight text-gold">{entry.title}</h4>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{entry.body}</p>
    </div>
  );
}

/** One chapter of the Codex: a dedication and its collected pages. */
function LoreChapter({ chapter }: { chapter: LoreChapterView }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-1.5">
        <h4 className="text-sm font-black uppercase tracking-wide text-gold">
          {chapter.name}
        </h4>
        <span className="text-xs text-muted">
          {chapter.unlocked}/{chapter.total} pages
        </span>
      </div>
      <p className="mb-3 text-xs italic leading-snug text-muted">
        {chapter.blurb}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {chapter.entries.map((entry) => (
          <LoreLeaf key={entry.key} entry={entry} />
        ))}
      </div>
    </div>
  );
}

/**
 * The Lore Codex — a collectable book of world-building and satirical history
 * that unlocks as the hero progresses. Read-only server component: loads the
 * hero, derives which pages they've earned from existing data, and renders the
 * whole thing as an illuminated manuscript with a completion header.
 */
export default async function LorePanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const { chapters, unlocked, total } = await loadLore(character.id);
  const completion = total === 0 ? 0 : Math.round((unlocked / total) * 100);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-4">
        <h3 className="font-black text-gold">📜 The Lore Codex</h3>
        <p className="text-sm text-muted">
          The realm's own history, written in the aftermath of its saving.{" "}
          {unlocked} of {total} pages illuminated —{" "}
          <span className="text-gold">{completion}%</span> of the tale recovered.
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {chapters.map((chapter) => (
          <LoreChapter key={chapter.key} chapter={chapter} />
        ))}
      </div>
    </section>
  );
}
