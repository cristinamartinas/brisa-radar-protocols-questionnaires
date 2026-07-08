import { loadCharacter } from "@/lib/data";
import {
  listExpeditionTiers,
  loadActiveExpedition,
  startExpedition,
} from "@/lib/expeditions";
import { ExpeditionTimer } from "@/components/ExpeditionTimer";
import { ActionButton } from "@/components/ActionButton";

/**
 * The War Table — a self-contained expedition panel. Loads the hero and any
 * active expedition on the server (so the timer is seeded against the server
 * clock), then either shows the live countdown or the tier choices to launch a
 * new march. Every launch/collect routes through a server action.
 */
export default async function ExpeditionPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const expedition = await loadActiveExpedition(character.id);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3">
        <h3 className="font-black text-gold">🧭 The War Table</h3>
        <p className="text-sm text-muted">
          Great deeds take time. Commit your hero to a long march — the reward is
          sworn in blood the moment you set out, and paid when they return.
        </p>
      </div>

      {expedition ? (
        <ExpeditionTimer
          title={expedition.name}
          endsAt={expedition.endsAt.getTime()}
          startedAt={expedition.startedAt.getTime()}
          goldReward={expedition.rewardGold}
          xpReward={expedition.rewardXp}
          dustReward={expedition.rewardDust}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {(await listExpeditionTiers(character.level)).map((t) => {
            const mins = Math.round(t.durationSec / 60);
            const duration = mins >= 1 ? `${mins}m` : `${t.durationSec}s`;
            return (
              <ActionButton
                key={t.tier}
                action={startExpedition.bind(null, t.tier)}
                className="w-full bg-surface text-left hover:bg-surface-2"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {t.emoji} {t.label}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{duration}</span>
                  </span>
                  <span className="text-xs font-normal text-muted">{t.blurb}</span>
                  <span className="text-xs font-normal text-good">
                    ≈ {t.preview.gold.toLocaleString()}🪙 · {t.preview.xp.toLocaleString()} XP
                    {t.preview.dust > 0 ? ` · ${t.preview.dust} ✨` : ""}
                  </span>
                </span>
              </ActionButton>
            );
          })}
          <p className="mt-1 text-xs text-muted">
            One expedition at a time. Fortune favours the patient.
          </p>
        </div>
      )}
    </section>
  );
}
