import { loadCharacter } from "@/lib/data";
import { loadPets, adoptPet, foragePet } from "@/lib/pets";
import { ActionButton } from "@/components/ActionButton";

/**
 * Pets & Companions. Self-contained server component: loads the hero and their
 * menagerie, shows owned critters (with a level/XP bar and a cooldown-aware
 * Forage button) and an adopt shelf. The Forage/Adopt buttons only call the
 * server actions — cooldowns, costs, and rewards are all decided server-side.
 */
export default async function PetsPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const { owned, adoptable } = await loadPets(character.id);

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3">
        <h3 className="font-black text-gold">🐾 Pets &amp; Companions</h3>
        <p className="text-sm text-muted">
          Adopt a critter, send it foraging, and love it unconditionally as it
          brings home other people&apos;s gold.
        </p>
      </div>

      {/* Your menagerie */}
      {owned.length === 0 ? (
        <p className="rounded-lg bg-surface p-3 text-sm text-muted">
          No companions yet. Your shins are lonely. Adopt one below. 🐾
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {owned.map((pet) => (
            <div key={pet.id} className="flex flex-col rounded-lg bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{pet.species.emoji}</span>
                <div className="min-w-0">
                  <div className="truncate font-bold leading-tight">
                    {pet.name}
                  </div>
                  <div className="text-xs text-muted">
                    Lv {pet.level} {pet.species.name}
                  </div>
                </div>
              </div>

              {/* XP bar */}
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>XP</span>
                  <span>
                    {pet.xp} / {pet.xpNeeded}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pet.xpPct}%`, background: "var(--gold)" }}
                  />
                </div>
              </div>

              {/* Forage */}
              <div className="mt-3">
                {pet.canForage ? (
                  <ActionButton
                    action={foragePet.bind(null, pet.id)}
                    className="w-full bg-good text-[#10240a]"
                  >
                    Send Foraging 🧺
                  </ActionButton>
                ) : (
                  <div className="rounded-lg bg-surface-2 px-3 py-2 text-center text-sm font-semibold text-muted">
                    😴 Napping — ~{Math.ceil(pet.cooldownRemainingSec / 60)} min
                    to go
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adopt shelf */}
      <h4 className="mt-5 mb-2 font-black text-gold">🏠 The Adoption Shelter</h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {adoptable.map(({ species, affordable }) => (
          <div
            key={species.key}
            className="flex flex-col rounded-lg bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{species.emoji}</span>
              <span className="font-bold leading-tight">{species.name}</span>
            </div>
            <p className="mt-1 mb-3 flex-1 text-xs text-muted">
              {species.description}
            </p>
            {affordable ? (
              <ActionButton
                action={adoptPet.bind(null, species.key, undefined)}
                className="w-full bg-gold text-[#2b1d12]"
              >
                Adopt {species.adoptCost}🪙
              </ActionButton>
            ) : (
              <div className="rounded-lg bg-surface-2 px-2 py-2 text-center text-sm font-semibold text-muted opacity-60">
                Adopt {species.adoptCost}🪙
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
