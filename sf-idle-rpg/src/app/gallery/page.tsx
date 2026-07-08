import { GameSprite } from "@/components/GameSprite";
import {
  itemSprite,
  fighterSprite,
  classSprite,
  currencySprite,
  catalogSprite,
} from "@/lib/art/sprite";

// A visual index of the procedural placeholder art system. Every content family
// gets a row so the whole set can be eyeballed at /gallery. Not linked from the
// game; it's a design reference (and a preview of what real art will replace).

export const metadata = { title: "Art Gallery — Quest & Cudgel" };

function Section({ title, blurb, children }: { title: string; blurb?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="font-black text-gold">{title}</h2>
      {blurb && <p className="mb-3 mt-0.5 text-sm text-muted">{blurb}</p>}
      <div className="flex flex-wrap gap-4">{children}</div>
    </section>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-20 flex-col items-center gap-1 text-center">
      {children}
      <span className="text-[10px] leading-tight text-muted">{label}</span>
    </div>
  );
}

export default function GalleryPage() {
  const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
  const CLASSES = ["WARRIOR", "MAGE", "SCOUT"];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
      <header>
        <h1 className="text-2xl font-black text-gold">🎨 Quest &amp; Cudgel — Art System</h1>
        <p className="text-sm text-muted">
          Every entity in the game gets a framed, themed placeholder. Drop real art into{" "}
          <code>/public/art</code> and register it to replace any of these one at a time.
        </p>
      </header>

      <Section title="Equipment — drawn vector art" blurb="Weapons/armor/amulets are real drawn icons picked from the item's name, tinted by rarity. Frame color + glow scale with rarity; the corner tag shows the grade.">
        {[
          ["Sword", "WEAPON"],
          ["Battle Axe", "WEAPON"],
          ["Hunting Bow", "WEAPON"],
          ["War Staff", "WEAPON"],
          ["Dagger", "WEAPON"],
          ["Spiked Mace", "WEAPON"],
          ["Knobbly Cudgel", "WEAPON"],
          ["Plate", "ARMOR"],
          ["Silk Robe", "ARMOR"],
          ["Chainmail", "ARMOR"],
          ["Amulet", "AMULET"],
          ["Signet Ring", "AMULET"],
        ].map(([name, slot], i) => {
          const rarity = RARITIES[i % RARITIES.length];
          return (
            <Cell key={name} label={`${rarity} ${name}`}>
              <GameSprite size={56} sprite={itemSprite({ name, slot, rarity })} title={name} />
            </Cell>
          );
        })}
      </Section>

      <Section title="Rarity ramp" blurb="The same sword across all four rarities.">
        {RARITIES.map((rarity) => (
          <Cell key={rarity} label={`${rarity}`}>
            <GameSprite size={56} sprite={itemSprite({ name: "Sword", slot: "WEAPON", rarity })} />
          </Cell>
        ))}
      </Section>

      <Section title="Heroes & Foes" blurb="Fighters are medallions colored by class; bosses get a danger ring and a hot glow.">
        {CLASSES.map((c) => (
          <Cell key={c} label={c}>
            <GameSprite size={56} sprite={classSprite(c)} />
          </Cell>
        ))}
        <Cell label="Warrior NPC">
          <GameSprite size={56} sprite={fighterSprite({ name: "Grunk the Unwashed", class: "WARRIOR" })} />
        </Cell>
        <Cell label="Dungeon Boss">
          <GameSprite size={56} sprite={fighterSprite({ name: "Embermaw", class: "MAGE", glyph: "🔥", boss: true })} />
        </Cell>
        <Cell label="World Boss">
          <GameSprite size={56} sprite={fighterSprite({ name: "Gorehoof", glyph: "👹", boss: true })} />
        </Cell>
      </Section>

      <Section title="Currencies" blurb="Unified coins for gold, mushrooms, and dust.">
        <Cell label="Gold"><GameSprite size={48} sprite={currencySprite("GOLD")} /></Cell>
        <Cell label="Mushrooms"><GameSprite size={48} sprite={currencySprite("MUSHROOMS")} /></Cell>
        <Cell label="Dust"><GameSprite size={48} sprite={currencySprite("DUST")} /></Cell>
      </Section>

      <Section title="Companions" blurb="Pet species.">
        {[
          ["battle_chicken", "🐔", "Battle Chicken"],
          ["warp_snail", "🐌", "Warp Snail"],
          ["trash_panda", "🦝", "Trash Panda"],
          ["tax_toad", "🐸", "Tax Toad"],
          ["judgemental_owl", "🦉", "Judgemental Owl"],
          ["union_beaver", "🦫", "Union Beaver"],
        ].map(([key, glyph, label]) => (
          <Cell key={key} label={label}>
            <GameSprite size={52} sprite={catalogSprite({ kind: "pet", id: key, glyph })} />
          </Cell>
        ))}
      </Section>

      <Section title="Talents & Skills">
        {[
          ["might", "💪", "Might"],
          ["arcana", "🔮", "Arcana"],
          ["paragon", "👑", "Paragon"],
          ["FIREBALL", "🔥", "Fireball"],
          ["EXECUTE", "☠️", "Execute"],
          ["RALLY", "📣", "Rally"],
        ].map(([key, glyph, label]) => (
          <Cell key={key} label={label}>
            <GameSprite size={48} sprite={catalogSprite({ kind: "talent", id: key, glyph })} />
          </Cell>
        ))}
      </Section>

      <Section title="Achievements" blurb="Bronze / Silver / Gold tiers.">
        {[
          ["Bronze", "🐣", "First Steps"],
          ["Silver", "🎖️", "Seasoned"],
          ["Gold", "🏔️", "Ascended"],
        ].map(([tier, glyph, label]) => (
          <Cell key={tier} label={`${label} (${tier})`}>
            <GameSprite size={52} sprite={catalogSprite({ kind: "achievement", id: label, glyph, tier })} />
          </Cell>
        ))}
      </Section>

      <Section title="Guild, Quests & Games">
        {[
          ["guildroom", "treasury", "🪙", "Treasury"],
          ["guildroom", "barracks", "🛡️", "Barracks"],
          ["quest", "epic", "🐉", "Grand Adventure"],
          ["expedition", "crusade", "🏰", "Grand Crusade"],
          ["wheel", "jackpot", "🎰", "Jackpot"],
          ["bounty", "boss-slugger", "🐲", "Boss Slugger"],
          ["fish", "pondwyrm", "🐉", "Pondwyrm"],
        ].map(([kind, id, glyph, label]) => (
          <Cell key={`${kind}-${id}`} label={label}>
            <GameSprite size={48} sprite={catalogSprite({ kind, id, glyph })} />
          </Cell>
        ))}
      </Section>
    </main>
  );
}
