"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleReplay } from "@/lib/actions";
import { GameSprite } from "@/components/GameSprite";
import { classSprite, fighterSprite } from "@/lib/art/sprite";
import { playSfx } from "@/lib/sound";

/**
 * <BattleReport/> — an animated, blow-by-blow duel overlay.
 *
 * Given a server-resolved BattleReplay (both fighters + a per-swing event
 * stream), it plays the fight out: HP bars drain, damage numbers pop over the
 * struck fighter, the log scrolls, and a Victory/Defeat banner lands at the end.
 * Purely presentational — the outcome was already decided and persisted on the
 * server; this just dramatizes it. Honors prefers-reduced-motion by resolving
 * instantly.
 */

const STEP_MS = 620;

const TONE_VAR: Record<"good" | "bad" | "gold", string> = {
  good: "var(--good)",
  bad: "var(--bad)",
  gold: "var(--gold)",
};

function HpBar({ hp, max, mine }: { hp: number; max: number; mine: boolean }) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100));
  const color = mine ? "var(--good)" : "var(--bad)";
  return (
    <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-surface">
      <div className="bt-hpfill h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function BattleReport({
  replay,
  onClose,
  onFightAgain,
  fightPending = false,
}: {
  replay: BattleReplay;
  onClose: () => void;
  /** When provided, a "Fight again" button re-runs the same fight in place. */
  onFightAgain?: () => void;
  /** True while a re-fight is resolving on the server. */
  fightPending?: boolean;
}) {
  const { me, foe, events, won, outcome, title, banner, foeStartHp } = replay;
  const heroSprite = classSprite(me.className);
  const oppSprite = fighterSprite({
    name: foe.name,
    class: foe.className,
    glyph: foe.glyph,
    boss: foe.boss,
  });

  // step: -1 = intro, 0..n-1 = each swing applied, >= n = finished.
  // (Reduced-motion is honored in CSS — the .bt-* animations become fades.)
  const [step, setStep] = useState(-1);
  const finished = step >= events.length;
  const logRef = useRef<HTMLDivElement>(null);

  // Advance the replay one swing at a time. setState lives in the timeout
  // callback (async), so this is not a synchronous effect cascade.
  useEffect(() => {
    if (finished) return;
    const delay = step < 0 ? 420 : STEP_MS;
    const id = setTimeout(() => setStep((s) => s + 1), delay);
    return () => clearTimeout(id);
  }, [step, finished]);

  // Sound + autoscroll as swings land.
  useEffect(() => {
    if (step < 0 || step >= events.length) return;
    const ev = events[step];
    playSfx(ev.crit ? "big" : "small");
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [step, events]);

  useEffect(() => {
    if (finished) playSfx(won ? "epic" : "error");
  }, [finished, won]);

  const applied = step < 0 ? -1 : Math.min(step, events.length - 1);
  const myHp = applied < 0 ? me.maxHp : events[applied].myHp;
  const foeHp = applied < 0 ? (foeStartHp ?? foe.maxHp) : events[applied].foeHp;
  const current = applied >= 0 ? events[applied] : null;

  // Damage/heal float shown over whichever fighter was struck this swing.
  const struckMe = current ? !current.byMe : false; // if foe attacked, I'm struck
  const logLines = events.slice(0, applied + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={finished ? onClose : undefined}
    >
      <div
        className="panel w-full max-w-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-center font-black text-gold">{title ?? "⚔️ Arena Duel"}</h3>

        {/* Combatants */}
        <div className="flex items-stretch justify-between gap-3">
          {[
            { f: me, hp: myHp, mine: true, struck: struckMe, sprite: heroSprite },
            { f: foe, hp: foeHp, mine: false, struck: current ? current.byMe : false, sprite: oppSprite },
          ].map((side, i) => (
            <div key={i} className={`flex flex-1 flex-col items-center ${i === 1 ? "order-3" : ""}`}>
              <div className={`relative ${side.struck ? "bt-hit" : ""}`} key={`fx-${step}-${i}`}>
                <GameSprite size={64} sprite={side.sprite} title={side.f.name} />
                {/* floating damage / heal for this swing */}
                {current && side.struck && current.dmg > 0 && (
                  <span
                    key={`dmg-${step}`}
                    className="bt-float"
                    style={{ color: current.crit ? "var(--gold)" : "var(--bad)", fontSize: current.crit ? 22 : 16 }}
                  >
                    {current.crit ? "💥" : ""}-{current.dmg}
                  </span>
                )}
                {current && current.byMe === side.mine && current.heal > 0 && (
                  <span key={`heal-${step}`} className="bt-heal" style={{ fontSize: 15 }}>
                    +{current.heal}
                  </span>
                )}
              </div>
              <div className="mt-1 w-full text-center">
                <div className="truncate text-sm font-bold">{side.f.name}</div>
                <div className="text-[11px] text-muted">{side.f.className}</div>
                <HpBar hp={side.hp} max={side.f.maxHp} mine={side.mine} />
                <div className="mt-0.5 text-[11px] tabular-nums text-muted">
                  {Math.round(side.hp)} / {side.f.maxHp}
                </div>
              </div>
            </div>
          ))}
          <div className="order-2 flex items-center text-lg font-black text-muted">VS</div>
        </div>

        {/* Blow-by-blow log */}
        <div
          ref={logRef}
          className="mt-4 h-28 overflow-y-auto rounded-lg bg-surface p-3 text-xs leading-relaxed text-muted"
        >
          {logLines.length === 0 ? (
            <p className="italic">The combatants size each other up…</p>
          ) : (
            logLines.map((ev, i) => (
              <div key={i}>
                <span className={ev.byMe ? "text-good" : "text-bad"}>
                  {ev.crit ? "💥 " : ""}
                  {ev.attacker}
                </span>{" "}
                hits {ev.defender} for <span className="font-bold text-foreground">{ev.dmg}</span>
                {ev.absorbed > 0 ? ` (${ev.absorbed} absorbed)` : ""}
                {ev.heal > 0 ? ` · heals ${ev.heal}` : ""}
                {ev.notes.map((n, j) => (
                  <div key={j} className="pl-3 text-[11px] italic opacity-80">{n}</div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer: skip while playing, result + close when done */}
        {finished ? (
          <div className="mt-4 text-center">
            <div
              className="text-lg font-black"
              style={{ color: banner ? TONE_VAR[banner.tone] : won ? "var(--good)" : "var(--bad)" }}
            >
              {banner ? banner.text : won ? "🏆 Victory!" : "☠️ Defeat"}
            </div>
            <p className="mt-1 text-sm text-muted">{outcome}</p>
            <div className="mt-3 flex gap-2">
              {onFightAgain && (
                <button
                  type="button"
                  onClick={onFightAgain}
                  disabled={fightPending}
                  className="flex-1 rounded-lg bg-accent px-4 py-2.5 font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
                >
                  {fightPending ? "Fighting…" : "Fight again ⚔️"}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg bg-gold px-4 py-2.5 font-bold text-[#2b1d12]"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setStep(events.length)}
              className="rounded-lg bg-surface-2 px-4 py-2 text-sm font-semibold text-muted hover:text-gold"
            >
              Skip ⏩
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BattleReport;
