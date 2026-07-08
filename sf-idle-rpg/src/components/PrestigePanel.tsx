import { loadCharacter } from "@/lib/data";
import { ActionButton } from "@/components/ActionButton";
import { rebirth } from "@/lib/prestige-actions";
import {
  REBIRTH_MIN_LEVEL,
  pointsForRebirth,
  ascensionBonusLabel,
} from "@/lib/prestige";

/**
 * Ascension / Rebirth — the long-game reset. Shows current prestige + power
 * bonus and (at the cap) lets the hero be Reborn for permanent Ascension points.
 */
export default async function PrestigePanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const canRebirth = character.level >= REBIRTH_MIN_LEVEL;
  const wouldGain = pointsForRebirth(character.level);

  return (
    <section className="panel mt-6 p-5">
      <h3 className="font-black text-gold">♻️ Ascension</h3>
      <p className="mt-1 mb-4 text-sm text-muted">
        At the peak, be <span className="text-gold">Reborn</span>: reset your
        level, attributes, and talents — but keep everything you own — and bank
        permanent Ascension points that make every future life stronger.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-surface px-3 py-2 text-sm">
          <div className="text-muted">Rebirths</div>
          <div className="text-lg font-black">♻️ {character.prestige}</div>
        </div>
        <div className="rounded-lg bg-surface px-3 py-2 text-sm">
          <div className="text-muted">Ascension pts</div>
          <div className="text-lg font-black text-gold">✨ {character.ascension}</div>
        </div>
        <div className="rounded-lg bg-surface px-3 py-2 text-sm">
          <div className="text-muted">Power bonus</div>
          <div className="text-lg font-black text-good">
            {ascensionBonusLabel(character.ascension)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {canRebirth ? (
          <>
            <p className="mb-2 text-sm text-muted">
              Being Reborn now banks{" "}
              <span className="font-bold text-gold">+{wouldGain}</span> Ascension
              point(s) and resets you to level 1. Your gold, gear, cosmetics,
              pets, guild, and records all stay.
            </p>
            <ActionButton action={rebirth} className="w-full bg-accent text-white">
              ♻️ Be Reborn (+{wouldGain} ✨)
            </ActionButton>
          </>
        ) : (
          <div className="rounded-lg bg-surface-2 px-3 py-3 text-center text-sm text-muted">
            Reach level {REBIRTH_MIN_LEVEL} to unlock Rebirth — you&rsquo;re level{" "}
            <span className="font-bold text-foreground">{character.level}</span>.
          </div>
        )}
      </div>
    </section>
  );
}
