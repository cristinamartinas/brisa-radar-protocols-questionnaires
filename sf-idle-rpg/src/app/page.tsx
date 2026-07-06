import { loadCharacter, loadLeaderboard, toFighter } from "@/lib/data";
import { goOnQuest, fightArena, abandonHero } from "@/lib/actions";
import { getClass, maxHp, xpForLevel } from "@/lib/game";
import { CreateHero } from "@/components/CreateHero";
import { ActionButton } from "@/components/ActionButton";

export default async function Home() {
  const character = await loadCharacter();

  if (!character) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <CreateHero />
      </main>
    );
  }

  const cls = getClass(character.class);
  const fighter = toFighter(character);
  const hp = maxHp(fighter);
  const nextLevelXp = xpForLevel(character.level);
  const xpPct = Math.min(100, Math.round((character.experience / nextLevelXp) * 100));
  const leaderboard = await loadLeaderboard();

  const stats: [string, number, boolean][] = [
    ["Strength", character.strength, cls.primary === "strength"],
    ["Dexterity", character.dexterity, cls.primary === "dexterity"],
    ["Intelligence", character.intelligence, cls.primary === "intelligence"],
    ["Constitution", character.constitution, false],
    ["Luck", character.luck, false],
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black tracking-tight text-gold">
          Quest &amp; Cudgel
        </h1>
        <div className="flex items-center gap-4 text-sm font-bold">
          <span className="text-gold">🪙 {character.gold.toLocaleString()}</span>
          <span>🍄 {character.mushrooms}</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hero panel */}
        <section className="panel p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{cls.emoji}</div>
            <div>
              <h2 className="text-xl font-black">{character.name}</h2>
              <p className="text-sm text-muted">
                Level {character.level} {cls.label}
              </p>
            </div>
          </div>

          {/* XP bar */}
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>XP</span>
              <span>
                {character.experience} / {nextLevelXp}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full"
                style={{ width: `${xpPct}%`, background: "var(--gold)" }}
              />
            </div>
          </div>

          {/* HP + arena record */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-surface px-3 py-2">
              <div className="text-muted">Health</div>
              <div className="font-bold">❤️ {hp}</div>
            </div>
            <div className="rounded-lg bg-surface px-3 py-2">
              <div className="text-muted">Arena</div>
              <div className="font-bold">
                {character.arenaWins}W – {character.arenaLosses}L
              </div>
            </div>
          </div>

          {/* Attributes */}
          <ul className="mt-4 space-y-1.5">
            {stats.map(([label, value, primary]) => (
              <li
                key={label}
                className="flex items-center justify-between rounded-md px-3 py-1.5"
                style={{ background: primary ? "var(--surface-2)" : "transparent" }}
              >
                <span className="text-muted">
                  {label} {primary && <span className="text-gold">★</span>}
                </span>
                <span className="font-bold tabular-nums">{value}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Actions */}
        <section className="flex flex-col gap-4 lg:col-span-1">
          <div className="panel p-5">
            <h3 className="font-black text-gold">🍺 The Tavern</h3>
            <p className="mt-1 mb-3 text-sm text-muted">
              Take a quest to earn gold and experience.
            </p>
            <ActionButton
              action={goOnQuest}
              className="w-full bg-good text-[#10240a]"
            >
              Go on a Quest
            </ActionButton>
          </div>

          <div className="panel p-5">
            <h3 className="font-black text-gold">🛡️ The Arena</h3>
            <p className="mt-1 mb-3 text-sm text-muted">
              Fight another hero. Win gold, risk a little pride.
            </p>
            <ActionButton
              action={fightArena}
              className="w-full bg-accent text-white"
            >
              Enter the Arena
            </ActionButton>
          </div>
        </section>

        {/* Hall of Fame */}
        <section className="panel p-5 lg:col-span-1">
          <h3 className="font-black text-gold">🏆 Hall of Fame</h3>
          <ol className="mt-3 space-y-1.5 text-sm">
            {leaderboard.map((h, i) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-md px-2 py-1"
                style={{
                  background:
                    h.id === character.id ? "var(--surface-2)" : "transparent",
                }}
              >
                <span className="truncate">
                  <span className="text-muted">{i + 1}.</span>{" "}
                  {getClass(h.class).emoji} {h.name}
                </span>
                <span className="ml-2 shrink-0 text-muted">Lv {h.level}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* History */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h3 className="mb-3 font-black text-gold">📜 Quest Log</h3>
          {character.questLogs.length === 0 ? (
            <p className="text-sm text-muted">No quests yet. To the tavern!</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {character.questLogs.map((q) => (
                <li key={q.id} className="flex justify-between gap-3">
                  <span className="truncate">{q.title}</span>
                  <span className="shrink-0 text-gold">
                    +{q.goldReward}🪙 +{q.xpReward}xp
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5">
          <h3 className="mb-3 font-black text-gold">⚔️ Battle Chronicle</h3>
          {character.battleLogs.length === 0 ? (
            <p className="text-sm text-muted">No arena fights yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {character.battleLogs.map((b) => {
                const rounds = JSON.parse(b.rounds) as string[];
                return (
                  <li key={b.id}>
                    <details>
                      <summary className="flex cursor-pointer justify-between gap-3">
                        <span className="truncate">
                          {b.won ? "🏆" : "☠️"} vs {b.opponentName}
                        </span>
                        <span
                          className="shrink-0"
                          style={{ color: b.won ? "var(--good)" : "var(--bad)" }}
                        >
                          {b.goldChange >= 0 ? "+" : ""}
                          {b.goldChange}🪙
                        </span>
                      </summary>
                      <ol className="mt-2 space-y-1 border-l border-border pl-3 text-xs text-muted">
                        {rounds.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ol>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Danger zone */}
      <form action={abandonHero} className="mt-8 text-center">
        <button
          type="submit"
          className="text-xs text-muted underline underline-offset-4 hover:text-bad"
        >
          Abandon this hero and start over
        </button>
      </form>
    </main>
  );
}
