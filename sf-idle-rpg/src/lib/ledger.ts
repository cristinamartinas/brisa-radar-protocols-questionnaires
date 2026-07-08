import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * The append-only currency ledger.
 *
 * `Character.gold`/`mushrooms` are cached balances for fast reads; this ledger
 * is the source of truth for how they got there. Every currency movement in the
 * game routes a ledger row through here, so the economy is auditable and
 * anomaly-detectable, and a balance can always be reconciled by replaying its
 * deltas.
 *
 * These return Prisma operations meant to be appended to the SAME transaction
 * that updates the cached balance, so the ledger and the cache can never drift.
 * The caller is responsible for setting `Character.gold = current + Σdelta`.
 */

export type Wallet = { gold: number; mushrooms: number; dust: number };
export type CurrencyDelta = Partial<Wallet>;

/** Common, greppable reasons — keep the audit trail categorical. */
export type LedgerReason =
  | "SIGNUP_GRANT"
  | "QUEST_REWARD"
  | "ARENA_WIN"
  | "ARENA_LOSS"
  | "DUNGEON_REWARD"
  | "SHOP_BUY"
  | "SHOP_SELL"
  | "GUILD_FOUND"
  | "SALVAGE"
  | "FORGE_REROLL"
  | "FORGE_UPGRADE"
  | "DAILY_REWARD"
  | "TALENT_RESPEC"
  | "TOWER_REWARD"
  | "WORLDBOSS_REWARD"
  | "GUILD_UPGRADE"
  | "TITLE_PURCHASE"
  | "WHEEL_REWARD"
  | "PIT_COLLECT"
  | "PIT_UPGRADE"
  | "PET_FORAGE"
  | "PET_ADOPT"
  | "MAIL_CLAIM";

/**
 * Build ledger-insert operations for a currency change. `current` is the
 * hero's balance BEFORE this change; `balanceAfter` is computed to match the
 * cached balance the caller will write.
 */
export function currencyLedgerOps(
  characterId: string,
  current: { gold: number; mushrooms: number; dust?: number },
  delta: CurrencyDelta,
  reason: LedgerReason,
): Prisma.PrismaPromise<unknown>[] {
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  if (delta.gold) {
    ops.push(
      prisma.currencyLedger.create({
        data: {
          characterId,
          currency: "GOLD",
          delta: delta.gold,
          balanceAfter: current.gold + delta.gold,
          reason,
        },
      }),
    );
  }
  if (delta.mushrooms) {
    ops.push(
      prisma.currencyLedger.create({
        data: {
          characterId,
          currency: "MUSHROOMS",
          delta: delta.mushrooms,
          balanceAfter: current.mushrooms + delta.mushrooms,
          reason,
        },
      }),
    );
  }
  if (delta.dust) {
    ops.push(
      prisma.currencyLedger.create({
        data: {
          characterId,
          currency: "DUST",
          delta: delta.dust,
          balanceAfter: (current.dust ?? 0) + delta.dust,
          reason,
        },
      }),
    );
  }
  return ops;
}
