import { loadCharacter } from "@/lib/data";
import {
  evaluateAchievements,
  syncAchievements,
  type AchievementTier,
  type EvaluatedAchievement,
} from "@/lib/achievements";
import { ActionButton } from "@/components/ActionButton";
import { GameSprite } from "@/components/GameSprite";
import { catalogSprite } from "@/lib/art/sprite";
import type { ActionResult } from "@/lib/actions";

// Tier accents — warm metals, matched to the game's gold-leaning palette.
const TIER_COLOR: Record<AchievementTier, string> = {
  Bronze: "#b87333",
  Silver: "#c7ccd1",
  Gold: "#e8b923",
};

function AchievementCard({ a }: { a: EvaluatedAchievement }) {
  const accent = TIER_COLOR[a.tier];

  return (
    <div
      className="flex flex-col rounded-lg border bg-surface p-3 transition"
      style={{
        borderColor: a.unlocked ? accent : "var(--border)",
        opacity: a.unlocked ? 1 : 0.55,
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className="leading-none"
          style={{
            filter: a.unlocked ? "none" : "grayscale(1)",
            opacity: a.unlocked ? 1 : 0.7,
          }}
        >
          <GameSprite
            sprite={catalogSprite({
              kind: "achievement",
              id: a.key,
              glyph: a.emoji,
              tier: a.tier,
            })}
            size={44}
            title={a.name}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold leading-tight">{a.name}</span>
            <span
              className="shrink-0 text-[10px] font-black uppercase tracking-wide"
              style={{ color: accent }}
            >
              {a.tier}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-muted">
            {a.description}
          </p>
        </div>
      </div>

      <div className="mt-2 text-xs">
        {a.unlocked ? (
          <span className="font-semibold text-good">
            ✓ Unlocked
            {a.unlockedAt && (
              <span className="ml-1 font-normal text-muted">
                {a.unlockedAt.toLocaleDateString()}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted">🔒 {a.progressText}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Achievements showcase. Server component: loads the hero, evaluates the
 * catalog for display, and offers a "Check achievements" button that persists
 * any newly-earned milestones (prestige only — no currency).
 */
export default async function AchievementsPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const achievements = await evaluateAchievements(character.id);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-gold">🏅 Achievements</h3>
          <p className="text-sm text-muted">
            {unlockedCount} of {achievements.length} earned — glory, not gold.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <ActionButton
            action={syncAchievements as () => Promise<ActionResult>}
            className="bg-accent text-white"
          >
            Check achievements
          </ActionButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => (
          <AchievementCard key={a.key} a={a} />
        ))}
      </div>
    </section>
  );
}
