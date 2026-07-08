import { loadCharacter } from "@/lib/data";
import { loadPit, collectPit, upgradePit } from "@/lib/pit";
import { ActionButton } from "@/components/ActionButton";

/**
 * The Pit — a self-contained idle panel. Loads the hero and their Pit state on
 * the server (so `accrued` is computed against the server clock), then renders
 * a fill gauge, the current output, and Collect / Upgrade buttons. The buttons
 * always route through server actions; their labels reflect the disabled state.
 */
export default async function PitPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const pit = await loadPit(character.id);
  const fillPct = pit.capacity > 0
    ? Math.min(100, Math.round((pit.accrued / pit.capacity) * 100))
    : 0;
  const canCollect = pit.accrued > 0;
  const canAfford = character.gold >= pit.upgradeCost;

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-gold">⛏️ The Pit</h3>
          <p className="text-sm text-muted">
            A hole in the ground and a crew of gnomes who never clock off. Gold
            piles up whether you play or not — until the pile hits the cap.
          </p>
        </div>
        <div className="rounded-lg bg-surface-2 px-3 py-2 text-right">
          <div className="text-xs uppercase tracking-wide text-muted">Depth</div>
          <div className="text-2xl font-black text-gold leading-none">
            Lv {pit.level}
          </div>
        </div>
      </div>

      {/* Output read-out */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Output</div>
          <div className="mt-1 text-2xl font-black text-good">
            {pit.ratePerHour.toLocaleString()}🪙<span className="text-base text-muted">/hr</span>
          </div>
          <div className="text-xs text-muted">
            {pit.full ? "storage full — collect before it overflows" : "trickling in as we speak"}
          </div>
        </div>
        <div className="rounded-lg bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-muted">In the Pit</div>
          <div className="mt-1 text-2xl font-black text-gold">
            {pit.accrued.toLocaleString()}
            <span className="text-base text-muted"> / {pit.capacity.toLocaleString()}🪙</span>
          </div>
          <div className="text-xs text-muted">stored vs. storage cap</div>
        </div>
      </div>

      {/* Fill gauge */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>The pile</span>
          <span className={pit.full ? "text-bad" : undefined}>{fillPct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillPct}%`,
              background: pit.full ? "var(--bad)" : "var(--gold)",
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ActionButton
          action={collectPit}
          className={
            canCollect
              ? "w-full bg-gold text-[#2b1d12]"
              : "w-full bg-surface-2 text-muted"
          }
        >
          {canCollect ? `Collect ${pit.accrued.toLocaleString()}🪙` : "Nothing to collect yet"}
        </ActionButton>

        <ActionButton
          action={upgradePit}
          className={
            canAfford
              ? "w-full bg-good text-[#10240a]"
              : "w-full bg-surface-2 text-muted"
          }
        >
          {canAfford
            ? `Dig deeper — ${pit.upgradeCost.toLocaleString()}🪙`
            : `Dig deeper (need ${pit.upgradeCost.toLocaleString()}🪙)`}
        </ActionButton>
      </div>

      <p className="mt-3 text-xs text-muted">
        The gnomes have been busy. Upgrading raises both the hourly output and the
        storage cap — reinvest early, retire never.
      </p>
    </section>
  );
}
