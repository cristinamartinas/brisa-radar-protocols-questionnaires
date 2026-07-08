import { loadCharacter, loadLeaderboard, loadGuilds, toFighter } from "@/lib/data";
import {
  startQuest,
  fightArena,
  abandonHero,
  buyItem,
  equipItem,
  unequipItem,
  sellItem,
  refreshShop,
  raidDungeon,
  joinGuild,
  leaveGuild,
} from "@/lib/actions";
import { CreateGuild } from "@/components/CreateGuild";
import {
  getClass,
  maxHp,
  xpForLevel,
  equippedBonus,
  getRarity,
  SLOTS,
  QUEST_LENGTHS,
  DUNGEONS,
  type Attributes,
} from "@/lib/game";
import { logout } from "@/lib/auth";
import { AuthScreen } from "@/components/AuthScreen";
import { ActionButton } from "@/components/ActionButton";
import { QuestTimer } from "@/components/QuestTimer";
import DailiesPanel from "@/components/DailiesPanel";
import ForgePanel from "@/components/ForgePanel";
import TalentsPanel from "@/components/TalentsPanel";
import AchievementsPanel from "@/components/AchievementsPanel";
import SkillsPanel from "@/components/SkillsPanel";
import TowerPanel from "@/components/TowerPanel";
import WorldBossPanel from "@/components/WorldBossPanel";
import ProfilePanel from "@/components/ProfilePanel";
import GuildHallPanel from "@/components/GuildHallPanel";

const STAT_KEYS: [string, keyof Attributes][] = [
  ["Strength", "strength"],
  ["Dexterity", "dexterity"],
  ["Intelligence", "intelligence"],
  ["Constitution", "constitution"],
  ["Luck", "luck"],
];

const STAT_ABBR: Record<keyof Attributes, string> = {
  strength: "STR",
  dexterity: "DEX",
  intelligence: "INT",
  constitution: "CON",
  luck: "LCK",
};

type ItemRow = {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  location: string;
  price: number;
} & Attributes;

function itemBonuses(item: ItemRow): string {
  return STAT_KEYS.map(([, k]) => (item[k] > 0 ? `+${item[k]} ${STAT_ABBR[k]}` : ""))
    .filter(Boolean)
    .join(" · ");
}

export default async function Home() {
  const character = await loadCharacter();

  if (!character) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <AuthScreen />
      </main>
    );
  }

  const cls = getClass(character.class);
  const items = character.items as ItemRow[];
  const bonus = equippedBonus(items);
  const fighter = toFighter(character, items);
  const hp = maxHp(fighter);
  const nextLevelXp = xpForLevel(character.level);
  const xpPct = Math.min(100, Math.round((character.experience / nextLevelXp) * 100));
  const leaderboard = await loadLeaderboard();
  const guilds = await loadGuilds();

  const equippedBySlot = SLOTS.map((s) => ({
    slot: s,
    item: items.find((i) => i.location === "EQUIPPED" && i.slot === s.id),
  }));
  const inventory = items.filter((i) => i.location === "INVENTORY");
  const shop = items.filter((i) => i.location === "SHOP");

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
          <form action={logout}>
            <button className="rounded-md bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted hover:text-gold">
              Log out
            </button>
          </form>
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

          {/* Attributes (base + equipped gear) */}
          <ul className="mt-4 space-y-1.5">
            {STAT_KEYS.map(([label, key]) => {
              const primary = cls.primary === key;
              const gearBonus = bonus[key];
              return (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-md px-3 py-1.5"
                  style={{ background: primary ? "var(--surface-2)" : "transparent" }}
                >
                  <span className="text-muted">
                    {label} {primary && <span className="text-gold">★</span>}
                  </span>
                  <span className="font-bold tabular-nums">
                    {character[key] + gearBonus}
                    {gearBonus > 0 && (
                      <span className="ml-1 text-xs font-normal text-gold">
                        (+{gearBonus})
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Equipment slots */}
          <h3 className="mt-5 mb-2 text-sm font-black uppercase tracking-wide text-muted">
            Equipment
          </h3>
          <ul className="space-y-2">
            {equippedBySlot.map(({ slot, item }) => (
              <li key={slot.id} className="rounded-lg bg-surface px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span>{slot.emoji}</span>
                    {item ? (
                      <span
                        className="font-semibold"
                        style={{ color: getRarity(item.rarity).color }}
                      >
                        {item.name}
                      </span>
                    ) : (
                      <span className="text-muted">Empty {slot.label.toLowerCase()}</span>
                    )}
                  </span>
                  {item && (
                    <span className="flex shrink-0 gap-1">
                      <form action={unequipItem.bind(null, item.id)}>
                        <button className="rounded bg-surface-2 px-2 py-1 text-xs hover:text-gold">
                          Unequip
                        </button>
                      </form>
                      <form action={sellItem.bind(null, item.id)}>
                        <button className="rounded bg-surface-2 px-2 py-1 text-xs hover:text-bad">
                          Sell
                        </button>
                      </form>
                    </span>
                  )}
                </div>
                {item && (
                  <div className="mt-1 text-xs text-muted">{itemBonuses(item)}</div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Actions */}
        <section className="flex flex-col gap-4 lg:col-span-1">
          <div className="panel p-5">
            <h3 className="font-black text-gold">🍺 The Tavern</h3>
            {character.activeQuest ? (
              <div className="mt-3">
                <QuestTimer
                  title={character.activeQuest.title}
                  endsAt={character.activeQuest.endsAt.getTime()}
                  startedAt={character.activeQuest.startedAt.getTime()}
                  serverNow={Date.now()}
                  goldReward={character.activeQuest.goldReward}
                  xpReward={character.activeQuest.xpReward}
                />
              </div>
            ) : (
              <>
                <p className="mt-1 mb-3 text-sm text-muted">
                  Send your hero adventuring. Longer trips pay more.
                </p>
                <div className="flex flex-col gap-2">
                  {QUEST_LENGTHS.map((q) => (
                    <form key={q.key} action={startQuest.bind(null, q.key)}>
                      <button className="flex w-full items-center justify-between rounded-lg bg-surface px-4 py-2.5 text-left transition hover:bg-surface-2">
                        <span className="font-semibold">
                          {q.emoji} {q.label}
                        </span>
                        <span className="text-xs text-muted">
                          {q.durationSec}s · ×{q.mult} reward
                        </span>
                      </button>
                    </form>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="font-black text-gold">🛡️ The Arena</h3>
            <p className="mt-1 mb-3 text-sm text-muted">
              Fight another hero. Win gold, risk a little pride.
            </p>
            <ActionButton action={fightArena} className="w-full bg-accent text-white">
              Enter the Arena
            </ActionButton>
          </div>

          {/* Inventory */}
          <div className="panel p-5">
            <h3 className="font-black text-gold">🎒 Inventory</h3>
            {inventory.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Your bag is empty. Buy gear in the shop below.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {inventory.map((item) => (
                  <li key={item.id} className="rounded-lg bg-surface px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-semibold"
                        style={{ color: getRarity(item.rarity).color }}
                      >
                        {item.name}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <form action={equipItem.bind(null, item.id)}>
                          <button className="rounded bg-good px-2 py-1 text-xs font-semibold text-[#10240a]">
                            Equip
                          </button>
                        </form>
                        <form action={sellItem.bind(null, item.id)}>
                          <button className="rounded bg-surface-2 px-2 py-1 text-xs hover:text-bad">
                            Sell {Math.max(1, Math.round(item.price / 2))}🪙
                          </button>
                        </form>
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted">{itemBonuses(item)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Daily tasks & login streak */}
          <DailiesPanel />
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

      {/* Magic Shop */}
      <section className="panel mt-6 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-black text-gold">🪄 The Magic Shop</h3>
          <form action={refreshShop}>
            <button className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold hover:text-gold">
              ↻ Refresh stock
            </button>
          </form>
        </div>
        {shop.length === 0 ? (
          <p className="text-sm text-muted">Sold out! Refresh the stock.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shop.map((item) => {
              const rarity = getRarity(item.rarity);
              const affordable = character.gold >= item.price;
              return (
                <div
                  key={item.id}
                  className="flex flex-col rounded-lg border bg-surface p-3"
                  style={{ borderColor: rarity.color }}
                >
                  <div className="text-xs uppercase tracking-wide" style={{ color: rarity.color }}>
                    {rarity.label}
                  </div>
                  <div className="mt-0.5 font-semibold leading-snug">{item.name}</div>
                  <div className="mt-1 flex-1 text-xs text-muted">{itemBonuses(item)}</div>
                  <form action={buyItem.bind(null, item.id)} className="mt-3">
                    <button
                      disabled={!affordable}
                      className="w-full rounded-md bg-gold px-2 py-1.5 text-sm font-bold text-[#2b1d12] disabled:opacity-40"
                    >
                      Buy {item.price}🪙
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* The Forge — salvage & crafting */}
      <ForgePanel />

      {/* Dungeons */}
      <section className="panel mt-6 p-5">
        <h3 className="mb-1 font-black text-gold">🗝️ Dungeons</h3>
        <p className="mb-3 text-sm text-muted">
          Descend one floor at a time. Bosses get tougher — and drop better loot.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DUNGEONS.map((d) => {
            const prog = character.dungeons.find((p) => p.dungeonKey === d.key);
            const floor = prog?.floor ?? 1;
            const cleared = !!prog?.clearedAt || floor > d.floors;
            const done = cleared ? d.floors : floor - 1;
            const pct = Math.round((done / d.floors) * 100);
            return (
              <div key={d.key} className="flex flex-col rounded-lg bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{d.emoji}</span>
                  <div>
                    <div className="font-bold leading-tight">{d.name}</div>
                    <div className="text-xs text-muted">
                      Suggested Lv {d.baseLevel}+ · {d.floors} floors
                    </div>
                  </div>
                </div>

                <div className="mt-3 mb-1 flex justify-between text-xs text-muted">
                  <span>{cleared ? "Cleared" : `Floor ${floor} of ${d.floors}`}</span>
                  <span>
                    {done}/{d.floors}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: cleared ? "var(--good)" : "var(--gold)",
                    }}
                  />
                </div>

                <div className="mt-3">
                  {cleared ? (
                    <div className="rounded-lg bg-surface-2 px-3 py-2 text-center text-sm font-semibold text-good">
                      🏅 Conquered
                    </div>
                  ) : (
                    <ActionButton
                      action={raidDungeon.bind(null, d.key)}
                      className="w-full bg-accent text-white"
                    >
                      Fight Floor {floor} ⚔️
                    </ActionButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Infinite Tower */}
      <TowerPanel />

      {/* World Boss (server-wide co-op) */}
      <div className="mt-6">
        <WorldBossPanel />
      </div>

      {/* Talents */}
      <TalentsPanel />

      {/* Active skills / rotation */}
      <SkillsPanel />

      {/* Achievements */}
      <AchievementsPanel />

      {/* Hero profile & titles */}
      <ProfilePanel />

      {/* Guilds */}
      <section className="panel mt-6 p-5">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Your guild / create + join */}
          <div>
            <h3 className="mb-3 font-black text-gold">🏰 Guild</h3>
            {character.guild ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold">{character.guild.name}</span>{" "}
                    <span className="text-xs text-muted">[{character.guild.tag}]</span>
                  </div>
                  <form action={leaveGuild}>
                    <button className="rounded bg-surface-2 px-2 py-1 text-xs hover:text-bad">
                      Leave
                    </button>
                  </form>
                </div>
                <p className="mt-1 text-xs text-good">
                  Members earn +{Math.min(20, character.guild.members.length * 2)}%
                  quest gold.
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {character.guild.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between rounded-md px-2 py-1"
                      style={{
                        background:
                          m.id === character.id ? "var(--surface-2)" : "transparent",
                      }}
                    >
                      <span className="truncate">
                        {getClass(m.class).emoji} {m.name}
                        {m.id === character.guild!.founderId && (
                          <span className="ml-1 text-xs text-gold">★ founder</span>
                        )}
                      </span>
                      <span className="ml-2 shrink-0 text-muted">Lv {m.level}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm text-muted">
                  Join forces with other heroes for a quest-gold bonus, or found
                  your own guild.
                </p>
                <CreateGuild canAfford={character.gold >= 500} />
              </div>
            )}
          </div>

          {/* Guild leaderboard / directory */}
          <div>
            <h3 className="mb-3 font-black text-gold">📜 Guild Directory</h3>
            {guilds.length === 0 ? (
              <p className="text-sm text-muted">No guilds yet — be the first!</p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {guilds.map((g, i) => {
                  const mine = g.id === character.guildId;
                  return (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                      style={{ background: mine ? "var(--surface-2)" : "transparent" }}
                    >
                      <span className="min-w-0 truncate">
                        <span className="text-muted">{i + 1}.</span> {g.name}{" "}
                        <span className="text-xs text-muted">
                          [{g.tag}] · {g.memberCount} 👥 · {g.totalLevel} lv
                        </span>
                      </span>
                      {!character.guildId && !mine && (
                        <form action={joinGuild.bind(null, g.id)}>
                          <button className="shrink-0 rounded bg-good px-2 py-1 text-xs font-semibold text-[#10240a]">
                            Join
                          </button>
                        </form>
                      )}
                      {mine && <span className="shrink-0 text-xs text-gold">yours</span>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* Guild Hall & perks */}
      <GuildHallPanel />

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
