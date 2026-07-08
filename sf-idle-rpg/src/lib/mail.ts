import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps, type CurrencyDelta } from "@/lib/ledger";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// Mail / Inbox — the Crown Postal Service
//
// A message inbox that can carry claimable rewards: the delivery channel every
// live-ops system (events, apologies, gifts) needs. This module owns the Mail
// table. Other systems enqueue mail through `sendMail` — a plain helper, NOT a
// form action — so this file exports both data helpers and (per-function)
// server actions. Rewards always flow through the currency ledger under
// "MAIL_CLAIM", inside the same transaction that marks the message claimed, so
// balances and the audit trail can never drift. Everything is
// server-authoritative and ownership-checked against the session hero.
// ---------------------------------------------------------------------------

/** How many messages the inbox shows at once. */
const MAIL_CAP = 30;

/** A reward payload a piece of mail can carry. */
export interface MailReward {
  rewardGold: number;
  rewardMushrooms: number;
  rewardDust: number;
}

/** Options for enqueueing a message. Body/rewards are optional. */
export interface SendMailOptions {
  subject: string;
  body?: string;
  rewardGold?: number;
  rewardMushrooms?: number;
  rewardDust?: number;
}

/**
 * Enqueue a message for a hero — the reusable helper other modules call to
 * deliver gifts, apologies, and event rewards. A plain async function (not a
 * server action): drop it into any server-side flow to create a Mail row.
 * Negative reward amounts are clamped to zero — mail only ever gives.
 */
export async function sendMail(
  characterId: string,
  opts: SendMailOptions,
): Promise<void> {
  await prisma.mail.create({
    data: {
      characterId,
      subject: opts.subject,
      body: opts.body ?? "",
      rewardGold: Math.max(0, Math.round(opts.rewardGold ?? 0)),
      rewardMushrooms: Math.max(0, Math.round(opts.rewardMushrooms ?? 0)),
      rewardDust: Math.max(0, Math.round(opts.rewardDust ?? 0)),
    },
  });
}

/** True when a message carries any claimable reward. */
export function hasReward(mail: MailReward): boolean {
  return mail.rewardGold > 0 || mail.rewardMushrooms > 0 || mail.rewardDust > 0;
}

/** Turn a mail row's rewards into a ledger/currency delta. */
function mailDelta(mail: MailReward): CurrencyDelta {
  return {
    gold: mail.rewardGold,
    mushrooms: mail.rewardMushrooms,
    dust: mail.rewardDust,
  };
}

/** Human-friendly one-liner describing a reward. */
export function describeReward(mail: MailReward): string {
  const parts: string[] = [];
  if (mail.rewardGold) parts.push(`+${mail.rewardGold}🪙`);
  if (mail.rewardMushrooms) parts.push(`+${mail.rewardMushrooms}🍄`);
  if (mail.rewardDust) parts.push(`+${mail.rewardDust}✨`);
  return parts.join(" ");
}

export interface MailView {
  id: string;
  subject: string;
  body: string;
  rewardGold: number;
  rewardMushrooms: number;
  rewardDust: number;
  claimed: boolean;
  createdAt: Date;
}

export interface InboxView {
  mail: MailView[];
  /** Unclaimed (unread) message count — drives the inbox badge. */
  unclaimed: number;
}

/**
 * Load a hero's inbox: unclaimed first, then newest first, capped at
 * MAIL_CAP. If the hero has never received any mail, we lazily post a friendly
 * "Welcome to the realm" letter carrying a small starter reward — so the
 * feature demonstrates itself on first open.
 */
export async function loadMail(characterId: string): Promise<InboxView> {
  const total = await prisma.mail.count({ where: { characterId } });
  if (total === 0) {
    await sendMail(characterId, {
      subject: "Welcome to the realm!",
      body:
        "By order of the Crown Postal Service: greetings, hero, and welcome. " +
        "Please accept this modest purse as a token of the Crown's esteem — " +
        "may it speed you toward glory. Kindly claim it below.",
      rewardGold: 100,
      rewardMushrooms: 3,
    });
  }

  const mail = await prisma.mail.findMany({
    where: { characterId },
    orderBy: [{ claimed: "asc" }, { createdAt: "desc" }],
    take: MAIL_CAP,
  });

  const unclaimed = mail.filter((m) => !m.claimed).length;
  return { mail, unclaimed };
}

/**
 * Claim a single message's reward. Server-authoritative: the message must
 * belong to the session hero and still be unclaimed. Rewards are granted via
 * the ledger and the message is marked claimed in one transaction.
 */
export async function claimMail(mailId: string): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const mail = await prisma.mail.findFirst({
    where: { id: mailId, characterId: character.id },
  });
  if (!mail) return { ok: false, message: "That letter isn't in your satchel." };
  if (mail.claimed) {
    return { ok: false, message: "You've already claimed that one. 📭" };
  }
  if (!hasReward(mail)) {
    return { ok: false, message: "That letter carries no reward to claim." };
  }

  const delta = mailDelta(mail);

  await prisma.$transaction([
    prisma.mail.update({
      where: { id: mail.id },
      data: { claimed: true },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + (delta.gold ?? 0),
        mushrooms: character.mushrooms + (delta.mushrooms ?? 0),
        dust: character.dust + (delta.dust ?? 0),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms, dust: character.dust },
      delta,
      "MAIL_CLAIM",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `📬 Claimed "${mail.subject}" — ${describeReward(mail)}`,
  };
}

/**
 * Claim every unclaimed rewarded message at once. The deltas are summed and
 * granted through a single ledger entry per currency, all inside one
 * transaction, and each message is marked claimed.
 */
export async function claimAllMail(): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const unclaimed = await prisma.mail.findMany({
    where: { characterId: character.id, claimed: false },
  });
  const rewarded = unclaimed.filter(hasReward);
  if (rewarded.length === 0) {
    return { ok: false, message: "Nothing to claim — your satchel is settled. 📭" };
  }

  const delta: CurrencyDelta = rewarded.reduce<CurrencyDelta>(
    (sum, m) => ({
      gold: (sum.gold ?? 0) + m.rewardGold,
      mushrooms: (sum.mushrooms ?? 0) + m.rewardMushrooms,
      dust: (sum.dust ?? 0) + m.rewardDust,
    }),
    { gold: 0, mushrooms: 0, dust: 0 },
  );

  await prisma.$transaction([
    prisma.mail.updateMany({
      where: { id: { in: rewarded.map((m) => m.id) } },
      data: { claimed: true },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + (delta.gold ?? 0),
        mushrooms: character.mushrooms + (delta.mushrooms ?? 0),
        dust: character.dust + (delta.dust ?? 0),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms, dust: character.dust },
      delta,
      "MAIL_CLAIM",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `📬 Claimed ${rewarded.length} letter${
      rewarded.length === 1 ? "" : "s"
    } — ${describeReward({
      rewardGold: delta.gold ?? 0,
      rewardMushrooms: delta.mushrooms ?? 0,
      rewardDust: delta.dust ?? 0,
    })}`,
  };
}

/**
 * Discard a message. Only claimed messages, or rewardless notices, can be
 * removed — so an unclaimed reward can never be thrown away by accident.
 * Ownership-checked against the session hero.
 */
export async function deleteMail(mailId: string): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const mail = await prisma.mail.findFirst({
    where: { id: mailId, characterId: character.id },
  });
  if (!mail) return { ok: false, message: "That letter isn't in your satchel." };
  if (!mail.claimed && hasReward(mail)) {
    return { ok: false, message: "Claim its reward before discarding it. 🪙" };
  }

  await prisma.mail.delete({ where: { id: mail.id } });
  revalidatePath("/");
  return { ok: true, message: "Letter filed away. 🗑️" };
}
