import { loadCharacter } from "@/lib/data";
import {
  SKILLS,
  TRIGGERS,
  MAX_SLOTS,
  parseLoadout,
  skillUnlocked,
  getSkill,
  type LoadoutSlot,
} from "@/lib/skills";
import { setLoadout } from "@/lib/skills-actions";
import type { CharClass } from "@/lib/game";

/**
 * The Combat Rotation panel: slot up to four active skills, each bound to a
 * trigger, and the deterministic battle engine will fire them for you. There
 * is no real-time input here — the build IS the gameplay.
 *
 * Everything shown is re-validated by `setLoadout` server-side; the disabled
 * options are a courtesy, not a security boundary.
 */
export default async function SkillsPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const cls = character.class as CharClass;
  const level = character.level;
  const loadout = parseLoadout(character.skillLoadout);

  const unlocked = SKILLS.filter((s) => skillUnlocked(s, level, cls));
  const locked = SKILLS.filter((s) => !skillUnlocked(s, level, cls));

  // Thin FormData→setLoadout wrapper so this stays a self-contained server
  // component. A <form action> resolves to void; the page revalidates, so the
  // saved rotation simply reappears as the selects' new defaults.
  async function save(formData: FormData) {
    "use server";
    const slots: LoadoutSlot[] = [];
    const chosen = new Set<string>();
    for (let i = 0; i < MAX_SLOTS; i++) {
      const skill = String(formData.get(`skill-${i}`) ?? "");
      if (!skill || chosen.has(skill)) continue; // "" = empty slot; skip dupes
      chosen.add(skill);
      const trigger = String(formData.get(`trigger-${i}`) ?? "ALWAYS");
      slots.push({ skill, trigger });
    }
    await setLoadout(slots);
  }

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-gold">✨ Combat Rotation</h3>
          <p className="mt-1 text-sm text-muted">
            Equip up to {MAX_SLOTS} skills and pick when each one fires. Then step
            back — your hero swings on its own.
          </p>
        </div>
        <span className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-bold text-gold">
          {loadout.length}/{MAX_SLOTS} slotted
        </span>
      </div>

      <form action={save} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: MAX_SLOTS }, (_, i) => {
            const current = loadout[i];
            const currentSkill = current ? getSkill(current.skill) : undefined;
            return (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-muted">
                  <span>Slot {i + 1}</span>
                  {currentSkill && (
                    <span className="text-gold">
                      {currentSkill.emoji} {currentSkill.name}
                    </span>
                  )}
                </div>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Skill
                  <select
                    name={`skill-${i}`}
                    defaultValue={current?.skill ?? ""}
                    className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-gold"
                  >
                    <option value="">— empty —</option>
                    {unlocked.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.emoji} {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Trigger
                  <select
                    name={`trigger-${i}`}
                    defaultValue={current?.trigger ?? "ALWAYS"}
                    className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-gold"
                  >
                    {TRIGGERS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>

        <div>
          <button
            type="submit"
            className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-[#2b1d12]"
          >
            Save Rotation
          </button>
        </div>
      </form>

      {/* Skill compendium */}
      <h4 className="mt-5 mb-2 text-sm font-black uppercase tracking-wide text-muted">
        Skill Book
      </h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...unlocked, ...locked].map((s) => {
          const isLocked = !skillUnlocked(s, level, cls);
          return (
            <div
              key={s.key}
              className="flex flex-col rounded-lg border border-border bg-surface p-3"
              style={{ opacity: isLocked ? 0.55 : 1 }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-bold leading-tight">
                  <span className="text-xl">{s.emoji}</span>
                  {s.name}
                </span>
                {isLocked ? (
                  <span className="shrink-0 rounded bg-surface-2 px-2 py-0.5 text-xs font-bold text-bad">
                    🔒 Lv {s.unlockLevel}
                  </span>
                ) : (
                  <span className="shrink-0 rounded bg-surface-2 px-2 py-0.5 text-xs font-bold text-good">
                    Ready
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-xs text-muted">{s.description}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        Triggers, briefly:{" "}
        {TRIGGERS.map((t) => `${t.label} — ${t.description}`).join("  ·  ")}
      </p>
    </section>
  );
}
