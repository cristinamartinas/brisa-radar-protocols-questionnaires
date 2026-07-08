/**
 * Active Skills — the combat-rotation system where "the build IS the gameplay".
 *
 * A hero equips an ordered loadout of up to four skills, each bound to a
 * TRIGGER (a predicate over the fight state). During a deterministic duel the
 * engine (see game.ts → resolveBattle) walks the loadout every time the hero
 * takes a swing and fires whichever skills' triggers are satisfied.
 *
 * Two audiences import this file:
 *   1. The combat engine, which uses the PURE helpers (`applySkills`,
 *      `newSkillRuntime`, the catalog, the triggers). These never touch the
 *      database and are fully deterministic given `(inputs, rng)`.
 *   2. The UI, which calls the `setLoadout` SERVER ACTION to persist a chosen
 *      rotation.
 *
 * IMPORTANT: this module intentionally has NO file-level "use server" — it
 * exports pure functions too. Only `setLoadout` opts into server-action land,
 * via a `"use server"` directive on its first line.
 */

import type { Fighter, CharClass } from "@/lib/game";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** The maximum number of skills a hero may slot into their rotation. */
export const MAX_SLOTS = 4;

/** One persisted rotation entry: a skill bound to a trigger. */
export interface LoadoutSlot {
  skill: string;
  trigger: string;
}

/** What a skill actually does when it procs. */
export type SkillKind =
  | "POWER_STRIKE" // bonus damage as a % of the triggering strike
  | "FIREBALL" // flat magic burst scaling with Intelligence
  | "HEAL" // restore a % of max HP
  | "FIRST_AID" // flat heal scaling with Constitution
  | "SHIELD" // brace: soak the next incoming hit
  | "RALLY" // once-per-fight permanent damage buff
  | "EXECUTE" // bonus damage when the foe is nearly dead
  | "LUCKY_STAR"; // once-per-fight permanent crit-chance buff

export interface SkillDef {
  key: string;
  name: string;
  emoji: string;
  description: string;
  unlockLevel: number;
  kind: SkillKind;
  /** Effect strength; interpretation depends on `kind` (see applySkills). */
  magnitude: number;
  /** Optional class gate; omitted skills are open to everyone. */
  classReq?: CharClass;
}

export type TriggerKey =
  | "FIRST_ROUND"
  | "HP_BELOW_50"
  | "EVERY_3_ROUNDS"
  | "ON_CRIT"
  | "ALWAYS";

/** A snapshot of the fight from the acting fighter's point of view. */
export interface FightState {
  self: Fighter;
  foe: Fighter;
  selfHp: number;
  selfMaxHp: number;
  foeHp: number;
  foeMaxHp: number;
  /** The raw (pre-skill) damage of this turn's strike. */
  baseDmg: number;
  /** Whether this turn's strike landed a critical hit. */
  didCrit: boolean;
  /** 1-based count of the acting fighter's own attack turns so far. */
  turn: number;
}

export interface TriggerDef {
  key: TriggerKey;
  label: string;
  description: string;
  predicate: (s: FightState) => boolean;
}

// ---------------------------------------------------------------------------
// The catalog (code-defined; the DB only stores which keys are slotted)
// ---------------------------------------------------------------------------

export const SKILLS: SkillDef[] = [
  {
    key: "POWER_STRIKE",
    name: "Power Strike",
    emoji: "💢",
    description: "Wind up and hit harder. Adds +60% damage to the strike it fires on.",
    unlockLevel: 1,
    kind: "POWER_STRIKE",
    magnitude: 0.6,
  },
  {
    key: "FIRST_AID",
    name: "First Aid",
    emoji: "🩹",
    description: "Slap on a bandage mid-swing. Restores HP scaling with Constitution.",
    unlockLevel: 1,
    kind: "FIRST_AID",
    magnitude: 1.2,
  },
  {
    key: "SECOND_WIND",
    name: "Second Wind",
    emoji: "💚",
    description: "Dig deep and catch your breath. Heals 18% of your maximum HP.",
    unlockLevel: 2,
    kind: "HEAL",
    magnitude: 0.18,
  },
  {
    key: "FIREBALL",
    name: "Fireball",
    emoji: "🔥",
    description: "Hurl a gout of flame. Flat burst damage scaling with Intelligence.",
    unlockLevel: 3,
    kind: "FIREBALL",
    magnitude: 1.5,
  },
  {
    key: "LUCKY_STAR",
    name: "Lucky Star",
    emoji: "🍀",
    description: "Make a wish. Raises your critical-hit chance by 15% for the rest of the fight.",
    unlockLevel: 4,
    kind: "LUCKY_STAR",
    magnitude: 0.15,
  },
  {
    key: "BULWARK_STANCE",
    name: "Bulwark Stance",
    emoji: "🛡️",
    description: "Plant your feet and brace. Soaks a chunk of the next incoming hit (scales with Constitution).",
    unlockLevel: 4,
    kind: "SHIELD",
    magnitude: 1.5,
  },
  {
    key: "RALLY",
    name: "Rally",
    emoji: "📣",
    description: "A rousing bellow. Permanently boosts your damage by 15% (once per fight).",
    unlockLevel: 5,
    kind: "RALLY",
    magnitude: 0.15,
  },
  {
    key: "EXECUTE",
    name: "Execute",
    emoji: "☠️",
    description: "No mercy for the wounded. +100% damage when the foe is below 30% HP.",
    unlockLevel: 6,
    kind: "EXECUTE",
    magnitude: 1.0,
  },
];

export function getSkill(key: string | undefined | null): SkillDef | undefined {
  if (!key) return undefined;
  return SKILLS.find((s) => s.key === key);
}

export const TRIGGERS: TriggerDef[] = [
  {
    key: "ALWAYS",
    label: "Always",
    description: "Every time you swing. Reliable, if greedy.",
    predicate: () => true,
  },
  {
    key: "FIRST_ROUND",
    label: "Opening move",
    description: "Only on your very first attack of the fight.",
    predicate: (s) => s.turn === 1,
  },
  {
    key: "EVERY_3_ROUNDS",
    label: "Every 3rd turn",
    description: "On your 3rd, 6th, 9th… swing.",
    predicate: (s) => s.turn % 3 === 0,
  },
  {
    key: "HP_BELOW_50",
    label: "When bloodied",
    description: "Only while your health is below half.",
    predicate: (s) => s.selfHp < s.selfMaxHp * 0.5,
  },
  {
    key: "ON_CRIT",
    label: "On a critical",
    description: "Only when the triggering strike crits.",
    predicate: (s) => s.didCrit,
  },
];

export function getTrigger(key: string | undefined | null): TriggerDef | undefined {
  if (!key) return undefined;
  return TRIGGERS.find((t) => t.key === key);
}

/** A skill is available if the hero is high enough level and meets any class gate. */
export function skillUnlocked(
  skill: SkillDef,
  level: number,
  cls: CharClass,
): boolean {
  if (level < skill.unlockLevel) return false;
  if (skill.classReq && skill.classReq !== cls) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Combat runtime (deterministic; consumed by resolveBattle)
// ---------------------------------------------------------------------------

/**
 * Mutable per-fighter state that persists across the turns of a single fight:
 * accumulated buffs and a pending shield. Created fresh per fighter per battle.
 */
export interface SkillRuntime {
  /** How many of this fighter's own attack turns have elapsed. */
  turns: number;
  /** Multiplier applied to outgoing damage (RALLY stacks into this). */
  rallyMult: number;
  /** Flat crit-chance bonus (LUCKY_STAR stacks into this). */
  critBonus: number;
  /** Damage soaked from the NEXT incoming hit, then consumed. */
  shield: number;
  /** Keys of once-per-fight buffs that have already fired. */
  fired: Set<string>;
}

export function newSkillRuntime(): SkillRuntime {
  return { turns: 0, rallyMult: 1, critBonus: 0, shield: 0, fired: new Set() };
}

/** Immediate, this-turn effects returned by applySkills to the engine. */
export interface SkillOutcome {
  /** Extra damage to add to this turn's outgoing strike. */
  bonusDamage: number;
  /** HP to restore to the acting fighter this turn. */
  selfHeal: number;
  /** Narration lines to append to the battle log. */
  logs: string[];
}

/**
 * Resolve every skill in `loadout` whose trigger fires for the current fight
 * state, returning the immediate deltas (bonus damage, self-heal) and log
 * lines. Persistent effects (RALLY, LUCKY_STAR, SHIELD) are folded into the
 * mutable `state` so they carry across turns.
 *
 * Pure and deterministic: identical `(loadout, state, state-of-fight, rng)`
 * always yield identical deltas. It only reads `rng` if a proc needs
 * randomness (none currently do), so an empty loadout perturbs nothing —
 * which is exactly why legacy skill-less fights resolve bit-for-bit as before.
 */
export function applySkills(
  rng: () => number,
  loadout: LoadoutSlot[],
  s: FightState,
  state: SkillRuntime,
): SkillOutcome {
  const out: SkillOutcome = { bonusDamage: 0, selfHeal: 0, logs: [] };
  if (!loadout || loadout.length === 0) return out;

  const name = s.self.name;

  for (const slot of loadout) {
    const skill = getSkill(slot.skill);
    const trigger = getTrigger(slot.trigger);
    if (!skill || !trigger) continue;
    if (!trigger.predicate(s)) continue;

    switch (skill.kind) {
      case "POWER_STRIKE": {
        const extra = Math.round(s.baseDmg * skill.magnitude);
        if (extra > 0) {
          out.bonusDamage += extra;
          out.logs.push(`💢 ${name} pours it on with ${skill.name} for +${extra}!`);
        }
        break;
      }
      case "FIREBALL": {
        const burst = Math.max(1, Math.round(s.self.intelligence * skill.magnitude));
        out.bonusDamage += burst;
        out.logs.push(`🔥 ${name} unleashes ${skill.name} for ${burst}!`);
        break;
      }
      case "HEAL": {
        const heal = Math.max(1, Math.round(s.selfMaxHp * skill.magnitude));
        out.selfHeal += heal;
        out.logs.push(`💚 ${name} catches a ${skill.name}, mending ${heal} HP.`);
        break;
      }
      case "FIRST_AID": {
        const heal = Math.max(1, Math.round(s.self.constitution * skill.magnitude));
        out.selfHeal += heal;
        out.logs.push(`🩹 ${name} patches up with ${skill.name} for ${heal} HP.`);
        break;
      }
      case "SHIELD": {
        const amt = Math.max(1, Math.round(s.self.constitution * skill.magnitude));
        state.shield += amt;
        out.logs.push(`🛡️ ${name} sets a ${skill.name}, bracing for ${amt} damage.`);
        break;
      }
      case "RALLY": {
        if (state.fired.has(skill.key)) break;
        state.fired.add(skill.key);
        state.rallyMult += skill.magnitude;
        out.logs.push(
          `📣 ${name} sounds the ${skill.name} — damage up ${Math.round(skill.magnitude * 100)}% for the fight!`,
        );
        break;
      }
      case "LUCKY_STAR": {
        if (state.fired.has(skill.key)) break;
        state.fired.add(skill.key);
        state.critBonus += skill.magnitude;
        out.logs.push(`🍀 ${name} wishes upon a ${skill.name} — crits are now far likelier!`);
        break;
      }
      case "EXECUTE": {
        if (s.foeHp <= s.foeMaxHp * 0.3) {
          const extra = Math.round(s.baseDmg * skill.magnitude);
          if (extra > 0) {
            out.bonusDamage += extra;
            out.logs.push(`☠️ ${name} moves to ${skill.name} the wounded foe for +${extra}!`);
          }
        }
        break;
      }
    }
  }

  // The rng is threaded through for future randomized procs and to keep the
  // signature stable; current effects are fully deterministic.
  void rng;
  return out;
}

// ---------------------------------------------------------------------------
// Parsing + persistence
// ---------------------------------------------------------------------------

/**
 * Parse the stored `Character.skillLoadout` JSON into a validated, de-duped,
 * capped list of slots. Defensive by design: any malformed data, unknown
 * skill/trigger, or over-long list is quietly trimmed rather than thrown.
 */
export function parseLoadout(json: string | null | undefined): LoadoutSlot[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const out: LoadoutSlot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const skill = (entry as Record<string, unknown>).skill;
    const trigger = (entry as Record<string, unknown>).trigger;
    if (typeof skill !== "string" || typeof trigger !== "string") continue;
    if (!getSkill(skill) || !getTrigger(trigger)) continue;
    if (out.some((sl) => sl.skill === skill)) continue; // no duplicate skills
    out.push({ skill, trigger });
    if (out.length >= MAX_SLOTS) break;
  }
  return out;
}

