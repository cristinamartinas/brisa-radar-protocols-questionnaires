import { loadCharacter } from "@/lib/data";
import {
  loadCosmetics,
  equipCosmetic,
  unequipCosmetic,
  buyCosmetic,
  getCosmetic,
  type EvaluatedCosmetic,
} from "@/lib/cosmetics";
import { getClass } from "@/lib/game";
import { ActionButton } from "@/components/ActionButton";
import { GameSprite } from "@/components/GameSprite";
import { catalogSprite } from "@/lib/art/sprite";

/** Default frame ring when the hero hasn't equipped a colour. */
const DEFAULT_FRAME = "var(--border)";

function CosmeticCard({ c }: { c: EvaluatedCosmetic }) {
  const buyable = !c.unlocked && c.premium;
  // Frames show a colour swatch; avatars/banners show their emoji.
  const isFrame = c.kind === "frame";

  return (
    <div
      className="flex flex-col rounded-lg border bg-surface p-3 transition"
      style={{
        borderColor: c.equipped
          ? "var(--good)"
          : c.unlocked
            ? isFrame
              ? c.value
              : "var(--border)"
            : "var(--border)",
        opacity: c.unlocked ? 1 : 0.55,
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className="shrink-0 leading-none"
          style={{ filter: c.unlocked ? "none" : "grayscale(1)" }}
        >
          {isFrame ? (
            <GameSprite
              sprite={catalogSprite({
                kind: "frame",
                id: c.key,
                glyph: "",
                tint: c.value,
                shape: "round",
                ring: "ornate",
              })}
              size={40}
              title={c.label}
            />
          ) : (
            <GameSprite
              sprite={catalogSprite({
                kind: c.kind,
                id: c.key,
                glyph: c.value,
              })}
              size={40}
              title={c.label}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold leading-tight">{c.label}</span>
            {c.premium && (
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-gold">
                Premium
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-snug text-muted">{c.flavor}</p>
        </div>
      </div>

      <div className="mt-3">
        {c.equipped ? (
          <ActionButton
            action={unequipCosmetic.bind(null, c.kind)}
            className="w-full bg-good !py-1.5 text-sm text-[#10240a]"
          >
            ✓ Equipped — Remove
          </ActionButton>
        ) : c.unlocked ? (
          <ActionButton
            action={equipCosmetic.bind(null, c.kind, c.key)}
            className="w-full bg-surface-2 !py-1.5 text-sm hover:text-gold"
          >
            Equip
          </ActionButton>
        ) : buyable ? (
          <ActionButton
            action={buyCosmetic.bind(null, c.kind, c.key)}
            className="w-full bg-accent !py-1.5 text-sm text-white"
          >
            Buy {c.cost}🍄
          </ActionButton>
        ) : (
          <div className="rounded-md px-1 text-xs text-muted">
            🔒 {c.progressText}
          </div>
        )}
      </div>
    </div>
  );
}

function Gallery({
  title,
  hint,
  items,
}: {
  title: string;
  hint: string;
  items: EvaluatedCosmetic[];
}) {
  const unlocked = items.filter((i) => i.unlocked).length;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-black uppercase tracking-wide text-muted">
          {title}
        </h4>
        <span className="shrink-0 text-xs text-muted">
          {unlocked}/{items.length} unlocked
        </span>
      </div>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((c) => (
          <CosmeticCard key={c.key} c={c} />
        ))}
      </div>
    </div>
  );
}

/**
 * Cosmetics / Dressing Room — a self-contained showcase where the hero plays
 * dress-up. Up top: a live preview of the profile card exactly as it looks with
 * the equipped avatar, frame-colour ring, and banner. Below: three galleries
 * (avatars, frames, banners) with Equip / Remove / Buy / locked-hint states.
 * Pure identity — nothing here touches combat or stats.
 */
export default async function CosmeticsPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const cls = getClass(character.class);
  const cosmetics = await loadCosmetics(character.id);

  // Resolve the equipped keys into their display values (falling back to the
  // plain defaults) for the live preview.
  const avatarDef = character.avatar
    ? getCosmetic("avatar", character.avatar)
    : undefined;
  const frameDef = character.frameColor
    ? getCosmetic("frame", character.frameColor)
    : undefined;
  const bannerDef = character.banner
    ? getCosmetic("banner", character.banner)
    : undefined;

  const portrait = avatarDef?.value ?? cls.emoji;
  const ringColor = frameDef?.value ?? DEFAULT_FRAME;

  return (
    <section className="panel mt-6 p-5">
      <h3 className="mb-1 font-black text-gold">💃 Dressing Room</h3>
      <p className="mb-4 text-sm text-muted">
        Fuss over your hero&apos;s look — a portrait, a frame colour, a banner.
        All flair, zero stats. Unlock most by adventuring; a few are yours for a
        mushroom or two.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live preview */}
        <div className="lg:col-span-1">
          <h4 className="mb-2 text-sm font-black uppercase tracking-wide text-muted">
            Live Preview
          </h4>
          <div className="rounded-xl bg-surface-2 p-5 text-center">
            {/* Banner */}
            <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted">
              {bannerDef ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-semibold text-gold">
                  <span className="text-base">{bannerDef.value}</span>
                  {bannerDef.label}
                </span>
              ) : (
                <span className="text-xs italic">No banner flying</span>
              )}
            </div>

            {/* Framed portrait */}
            <div className="flex justify-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full bg-surface"
                style={{ border: `4px solid ${ringColor}` }}
              >
                <GameSprite
                  sprite={catalogSprite({
                    kind: "avatar",
                    id: "preview",
                    glyph: portrait,
                    tint: ringColor,
                    shape: "round",
                  })}
                  size={64}
                  title={character.name}
                />
              </div>
            </div>

            <h4 className="mt-3 truncate text-xl font-black leading-tight">
              {character.name}
            </h4>
            <p className="text-xs text-muted">
              Level {character.level} {cls.label}
            </p>

            <dl className="mt-4 space-y-1 text-left text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">Portrait</dt>
                <dd className="font-semibold">
                  {avatarDef ? avatarDef.label : "Class default"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Frame</dt>
                <dd className="font-semibold">
                  {frameDef ? frameDef.label : "Plain"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Banner</dt>
                <dd className="font-semibold">
                  {bannerDef ? bannerDef.label : "None"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Galleries */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Gallery
            title="Portraits"
            hint="The face you show the realm."
            items={cosmetics.avatars}
          />
          <Gallery
            title="Frame Colours"
            hint="The ring around your portrait."
            items={cosmetics.frames}
          />
          <Gallery
            title="Banners"
            hint="A little emblem to fly over your card."
            items={cosmetics.banners}
          />
        </div>
      </div>
    </section>
  );
}
