import Link from "next/link";
import { loadCharacter, loadLeaderboard, loadGuilds, toFighter } from "@/lib/data";
import {
  startQuest,
  abandonHero,
  buyItem,
  refreshShop,
  joinGuild,
  leaveGuild,
} from "@/lib/actions";
import { CreateGuild } from "@/components/CreateGuild";
import {
  getClass,
  maxHp,
  xpForLevel,
  getRarity,
  damageRange,
  critChance,
  SLOTS,
  QUEST_LENGTHS,
  DUNGEONS,
  type Attributes,
} from "@/lib/game";
import { logout } from "@/lib/auth";
import { AuthScreen } from "@/components/AuthScreen";
import { QuestTimer } from "@/components/QuestTimer";
import DailiesPanel from "@/components/DailiesPanel";
import ForgePanel from "@/components/ForgePanel";
import TalentsPanel from "@/components/TalentsPanel";
import AchievementsPanel from "@/components/AchievementsPanel";
import SkillsPanel from "@/components/SkillsPanel";
import TowerPanel from "@/components/TowerPanel";
import WorldBossPanel from "@/components/WorldBossPanel";
import ProfilePanel from "@/components/ProfilePanel";
import SeasonPassPanel from "@/components/SeasonPassPanel";
import ExpeditionPanel from "@/components/ExpeditionPanel";
import FishingPanel from "@/components/FishingPanel";
import BestiaryPanel from "@/components/BestiaryPanel";
import CosmeticsPanel from "@/components/CosmeticsPanel";
import WheelPanel from "@/components/WheelPanel";
import BountyBoardPanel from "@/components/BountyBoardPanel";
import DicePanel from "@/components/DicePanel";
import DailyShopPanel from "@/components/DailyShopPanel";
import RecordsPanel from "@/components/RecordsPanel";
import LorePanel from "@/components/LorePanel";
import OnboardingPanel from "@/components/OnboardingPanel";
import TrophyRoomPanel from "@/components/TrophyRoomPanel";
import { SoundToggle } from "@/components/SoundToggle";
import ArenaLadderPanel from "@/components/ArenaLadderPanel";
import ArenaScoutPanel from "@/components/ArenaScoutPanel";
import PrestigePanel from "@/components/PrestigePanel";
import { ArenaButton } from "@/components/ArenaButton";
import { DungeonFightButton } from "@/components/DungeonFightButton";
import { GearCompare } from "@/components/GearCompare";
import CharacterScreen from "@/components/CharacterScreen";
import RestCard from "@/components/RestCard";
import { LevelUpWatcher } from "@/components/LevelUpWatcher";
import { GameSprite } from "@/components/GameSprite";
import {
  itemSprite,
  classSprite,
  fighterSprite,
  currencySprite,
  catalogSprite,
} from "@/lib/art/sprite";

/** Section heading + scroll anchor for the category nav. */
function SectionHeading({ id, label }: { id: string; label: string }) {
  return (
    <h2
      id={id}
      className="mt-8 mb-1 scroll-mt-16 text-lg font-black tracking-tight text-gold"
    >
      {label}
    </h2>
  );
}
import PitPanel from "@/components/PitPanel";
import PetsPanel from "@/components/PetsPanel";
import MailPanel from "@/components/MailPanel";
import RankingsPanel from "@/components/RankingsPanel";
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

const TABS = [
  ["overview", "🧭 Overview"],
  ["character", "🛡️ Character"],
  ["liveops", "📅 Daily"],
  ["market", "🪄 Market"],
  ["idle", "⛏️ Idle & Games"],
  ["battle", "⚔️ Battle"],
  ["build", "🌟 Build"],
  ["meta", "🏆 Progress"],
  ["guild", "🏰 Guild"],
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some(([id]) => id === sp.tab)
    ? (sp.tab as string)
    : "overview";

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
  const fighter = toFighter(character, items);
  const hp = maxHp(fighter);
  const dmg = damageRange(fighter);
  const critPct = Math.round(critChance(fighter) * 100);
  const nextLevelXp = xpForLevel(character.level);
  const xpPct = Math.min(100, Math.round((character.experience / nextLevelXp) * 100));
  const leaderboard = await loadLeaderboard();
  const guilds = await loadGuilds();

  const equippedBySlot = SLOTS.map((s) => ({
    slot: s,
    item: items.find((i) => i.location === "EQUIPPED" && i.slot === s.id),
  }));
  // What's equipped in a given slot (for gear-comparison badges).
  const equippedFor = (slotId: string) =>
    equippedBySlot.find((e) => e.slot.id === slotId)?.item ?? null;
  const shop = items.filter((i) => i.location === "SHOP");

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
      {/* Fires a celebration whenever the hero levels up, from any source. */}
      <LevelUpWatcher level={character.level} />

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black tracking-tight text-gold">
          Quest &amp; Cudgel
        </h1>
        <div className="flex items-center gap-4 text-sm font-bold">
          <span className="flex items-center gap-1.5 text-gold">
            <GameSprite sprite={currencySprite("GOLD")} size={22} title="Gold" />
            {character.gold.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <GameSprite sprite={currencySprite("MUSHROOMS")} size={22} title="Mushrooms" />
            {character.mushrooms}
          </span>
          <SoundToggle />
          <form action={logout}>
            <button className="rounded-md bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted hover:text-gold">
              Log out
            </button>
          </form>
        </div>
      </header>

      {/* Sticky category navigation — each tab renders only its own panels */}
      <nav className="sticky top-0 z-30 -mx-4 mb-4 flex flex-wrap gap-1 border-b border-border bg-background/90 px-4 py-2 text-xs font-semibold backdrop-blur sm:-mx-6 sm:px-6">
        {TABS.map(([id, label]) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              href={id === "overview" ? "/" : `/?tab=${id}`}
              scroll={false}
              className="rounded-md px-2.5 py-1 transition"
              style={{
                background: active ? "var(--surface-2)" : "transparent",
                color: active ? "var(--gold)" : "var(--muted)",
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {tab === "overview" && (
        <>
          {/* "While you were away" rested earnings (hides until enough accrues) */}
          <RestCard />

          {/* New-player onboarding (hides itself for veterans) */}
          <OnboardingPanel />

          <div id="overview" className="grid gap-6 scroll-mt-16 lg:grid-cols-3">
        {/* Hero panel */}
        <section className="panel p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <GameSprite
              sprite={classSprite(character.class, cls.emoji)}
              size={60}
              title={`${cls.label} — ${character.name}`}
            />
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

          {/* Combat readout at a glance */}
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-surface px-3 py-2">
              <div className="text-muted">⚔️ Damage</div>
              <div className="font-bold tabular-nums">
                {dmg.min}–{dmg.max}
              </div>
            </div>
            <div className="rounded-lg bg-surface px-3 py-2">
              <div className="text-muted">🎯 Crit</div>
              <div className="font-bold tabular-nums">{critPct}%</div>
            </div>
          </div>

          {/* The full sheet — equipment, all attributes, and the backpack — lives
              on the Character tab, so Overview stays a dashboard. */}
          <Link
            href="/?tab=character"
            scroll={false}
            className="mt-4 block rounded-lg bg-surface-2 px-4 py-2.5 text-center text-sm font-semibold transition hover:text-gold"
          >
            🛡️ Manage gear &amp; stats →
          </Link>
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
                        <span className="flex items-center gap-2 font-semibold">
                          <GameSprite
                            sprite={catalogSprite({ kind: "quest", id: q.key, glyph: q.emoji })}
                            size={30}
                            title={q.label}
                          />
                          {q.label}
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
            <ArenaButton />
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
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <span className="text-muted">{i + 1}.</span>
                  <GameSprite
                    sprite={fighterSprite({ name: h.name, class: h.class })}
                    size={22}
                    title={getClass(h.class).label}
                  />
                  {h.name}
                </span>
                <span className="ml-2 shrink-0 text-muted">Lv {h.level}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

        </>
      )}

      {tab === "character" && <CharacterScreen />}

      {tab === "liveops" && (
        <>
          <SectionHeading id="liveops" label="📅 Daily & Live-Ops" />

      {/* Inbox */}
      <MailPanel />

      {/* Seasonal Pass */}
      <SeasonPassPanel />

      {/* Bounty board */}
      <BountyBoardPanel />

        </>
      )}

      {tab === "market" && (
        <>
          <SectionHeading id="market" label="🪄 Market & Crafting" />

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
                  <GameSprite
                    sprite={itemSprite({ name: item.name, slot: item.slot, rarity: item.rarity })}
                    size={48}
                    title={item.name}
                    className="mb-2"
                  />
                  <div className="text-xs uppercase tracking-wide" style={{ color: rarity.color }}>
                    {rarity.label}
                  </div>
                  <div className="mt-0.5 font-semibold leading-snug">{item.name}</div>
                  <div className="mt-1 text-xs text-muted">{itemBonuses(item)}</div>
                  <GearCompare candidate={item} equipped={equippedFor(item.slot)} className="mt-1 flex-1" />
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

        </>
      )}

      {tab === "idle" && (
        <>
          <SectionHeading id="idle" label="⛏️ Idle Earners & Games" />

      {/* Idle earners & collection */}
      <PitPanel />
      <WheelPanel />

      {/* Daily Deal & Tavern Dice */}
      <DailyShopPanel />
      <DicePanel />
      <PetsPanel />

      {/* Expeditions & Fishing */}
      <ExpeditionPanel />
      <FishingPanel />

        </>
      )}

      {tab === "battle" && (
        <>
          <SectionHeading id="battle" label="⚔️ Battle & Dungeons" />

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
                  <GameSprite
                    sprite={catalogSprite({ kind: "dungeon", id: d.key, glyph: d.emoji, shape: "round" })}
                    size={40}
                    title={d.name}
                  />
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
                  <DungeonFightButton dungeonKey={d.key} floor={floor} cleared={cleared} />
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

      {/* Scout & challenge specific opponents */}
      <ArenaScoutPanel />

      {/* Ranked arena ladder */}
      <ArenaLadderPanel />

        </>
      )}

      {tab === "build" && (
        <>
          <SectionHeading id="build" label="🌟 Character Build" />

      {/* Talents */}
      <TalentsPanel />

      {/* Active skills / rotation */}
      <SkillsPanel />

      {/* Ascension / rebirth */}
      <PrestigePanel />

        </>
      )}

      {tab === "meta" && (
        <>
          <SectionHeading id="meta" label="🏆 Progress & Collection" />

      {/* Achievements */}
      <AchievementsPanel />

      {/* Bestiary */}
      <BestiaryPanel />

      {/* Hall of Records */}
      <RecordsPanel />

      {/* Lore Codex */}
      <LorePanel />

      {/* Trophy Room — collection capstone */}
      <TrophyRoomPanel />

      {/* Hero profile & titles */}
      <ProfilePanel />

      {/* Cosmetics */}
      <CosmeticsPanel />

      {/* Rankings */}
      <RankingsPanel />

        </>
      )}

      {tab === "guild" && (
        <>
          <SectionHeading id="guild" label="🏰 Guild & Social" />

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
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <GameSprite
                          sprite={fighterSprite({ name: m.name, class: m.class })}
                          size={22}
                          title={getClass(m.class).label}
                        />
                        {m.name}
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

        </>
      )}

      {/* History (always shown, below the active tab) */}
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
                      <summary className="flex cursor-pointer items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-1.5 truncate">
                          <GameSprite
                            sprite={fighterSprite({ name: b.opponentName })}
                            size={22}
                            title={b.opponentName}
                          />
                          <span>{b.won ? "🏆" : "☠️"}</span> vs {b.opponentName}
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
