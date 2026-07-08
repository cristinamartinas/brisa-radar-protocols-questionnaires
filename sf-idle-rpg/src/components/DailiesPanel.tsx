import { loadCharacter } from "@/lib/data";
import { loadDailies, claimDailyTask, claimLogin } from "@/lib/dailies";
import { ActionButton } from "@/components/ActionButton";
import { GameSprite } from "@/components/GameSprite";
import { catalogSprite } from "@/lib/art/sprite";

/** One-line summary of a currency reward for the UI. */
function rewardLabel(reward: { gold?: number; mushrooms?: number }): string {
  const parts: string[] = [];
  if (reward.gold) parts.push(`+${reward.gold}🪙`);
  if (reward.mushrooms) parts.push(`+${reward.mushrooms}🍄`);
  return parts.join(" ");
}

/**
 * Daily Quests & Login Streak. Self-contained: loads the current hero and its
 * daily state, and renders the login check-in plus each daily task with its
 * progress and a claim button. Server-authoritative — the buttons just call the
 * actions, which re-validate before paying out.
 */
export default async function DailiesPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const dailies = await loadDailies(character.id);
  const claimedCount = dailies.tasks.filter((t) => t.claimed).length;

  return (
    <section className="panel p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black text-gold">📅 Daily Deeds</h3>
        <span className="text-xs text-muted">
          {claimedCount}/{dailies.tasks.length} claimed
        </span>
      </div>

      {/* Login streak */}
      <div className="rounded-lg bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold">🗓️ Daily Check-in</div>
            <div className="text-sm text-muted">
              {dailies.streak > 0 ? (
                <>
                  🔥 {dailies.streak}-day streak
                  {dailies.streak >= 7 && " — you legend"}
                </>
              ) : (
                "Show up to start a streak."
              )}
            </div>
          </div>
          {dailies.loginClaimed ? (
            <span className="shrink-0 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-semibold text-good">
              ✓ Checked in
            </span>
          ) : (
            <div className="shrink-0">
              <ActionButton
                action={claimLogin}
                className="bg-gold text-[#2b1d12]"
              >
                Check in
              </ActionButton>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          Come back every day — the streak pays more, with a 🍄 every 7th day.
        </p>
      </div>

      {/* Daily tasks */}
      <ul className="mt-3 space-y-2">
        {dailies.tasks.map((task) => (
          <li key={task.key} className="rounded-lg bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold">
                  <GameSprite
                    sprite={catalogSprite({
                      kind: "daily",
                      id: task.key,
                      glyph: task.emoji,
                    })}
                    size={30}
                    title={task.label}
                  />
                  <span className="truncate">{task.label}</span>
                </div>
                <div className="mt-0.5 text-xs">
                  <span className={task.done ? "text-good" : "text-muted"}>
                    {task.done ? "✓ Done" : "…in progress"}
                  </span>
                  <span className="text-muted"> · reward {rewardLabel(task.reward)}</span>
                </div>
              </div>
              <div className="shrink-0">
                {task.claimed ? (
                  <span className="rounded-md bg-surface-2 px-3 py-1.5 text-sm font-semibold text-good">
                    ✓ Claimed
                  </span>
                ) : task.done ? (
                  <ActionButton
                    action={claimDailyTask.bind(null, task.key)}
                    className="bg-good text-[#10240a]"
                  >
                    Claim
                  </ActionButton>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-lg bg-surface-2 px-4 py-3 text-sm font-semibold text-muted opacity-60"
                  >
                    Claim
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
