import { loadCharacter } from "@/lib/data";
import {
  climbTower,
  readTowerState,
  previewTowerFloor,
  loadTowerLeaderboard,
} from "@/lib/tower";
import { getClass } from "@/lib/game";
import { TowerFightButton } from "@/components/TowerFightButton";

/**
 * The Infinite Tower. Self-contained server component: loads the hero, their
 * Tower progress, a preview of the next boss, and the hall of highest climbers.
 * The Climb button just calls the server action, which re-validates and pays
 * out server-side — the browser never decides who wins.
 */
export default async function TowerPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const state = await readTowerState(character.id);
  const [preview, leaderboard] = await Promise.all([
    Promise.resolve(previewTowerFloor(state.currentFloor)),
    loadTowerLeaderboard(),
  ]);

  const bossClass = getClass(preview.boss.class);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-gold">🗼 The Infinite Tower</h3>
          <p className="text-sm text-muted">
            One boss per floor, forever. Climb until something rude knocks you
            back down — your best floor is yours to keep.
          </p>
        </div>
      </div>

      {/* Progress read-out */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            This run
          </div>
          <div className="mt-1 text-2xl font-black text-gold">
            Floor {state.currentFloor}
          </div>
          <div className="text-xs text-muted">next to attempt</div>
        </div>
        <div className="rounded-lg bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            Personal best
          </div>
          <div className="mt-1 text-2xl font-black text-good">
            {state.highestFloor > 0 ? `Floor ${state.highestFloor}` : "—"}
          </div>
          <div className="text-xs text-muted">highest floor ever cleared</div>
        </div>
      </div>

      {/* Next boss preview */}
      <div className="mt-3 rounded-lg bg-surface-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted">
              Now guarding floor {preview.floor}
            </div>
            <div className="truncate font-bold leading-tight">
              {bossClass.emoji} {preview.boss.name}
            </div>
            <div className="text-xs text-muted">
              Lv {preview.boss.level} {bossClass.label} · {preview.bossHp} HP ·{" "}
              <span className="text-bad">{preview.menace}</span>
            </div>
          </div>
          <div className="shrink-0 text-right text-sm">
            <div className="text-gold">+{preview.reward.gold}🪙</div>
            <div className="text-muted">+{preview.reward.xp} XP</div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <TowerFightButton action={climbTower} floor={state.currentFloor} />
      </div>

      {/* Highest climbers */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-black text-gold">🏆 Highest Climbers</h4>
          <span className="text-xs text-muted">by best floor</span>
        </div>
        {leaderboard.length === 0 ? (
          <p className="rounded-lg bg-surface p-3 text-sm text-muted">
            Nobody has cleared a floor yet. Be the first name up here. 🪜
          </p>
        ) : (
          <ol className="space-y-1.5">
            {leaderboard.map((c, i) => {
              const cls = getClass(c.class);
              const mine = c.characterId === character.id;
              return (
                <li
                  key={c.characterId}
                  className="flex items-center gap-3 rounded-lg bg-surface p-3"
                  style={mine ? { outline: "1px solid var(--gold)" } : undefined}
                >
                  <span className="w-6 shrink-0 text-center font-black text-muted">
                    {i === 0 ? "👑" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {cls.emoji} {c.name}
                    {mine && <span className="ml-1 text-xs text-gold">(you)</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted">Lv {c.level}</span>
                  <span className="shrink-0 font-bold text-good">
                    Floor {c.highestFloor}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
