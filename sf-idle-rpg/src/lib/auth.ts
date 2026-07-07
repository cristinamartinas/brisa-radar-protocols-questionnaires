"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  getSessionToken,
  setSessionToken,
  clearSession,
  newSessionToken,
} from "@/lib/session";
import { getClass, generateShopStock, type CharClass } from "@/lib/game";
import { makeRng, randomSeed } from "@/lib/rng";
import { currencyLedgerOps } from "@/lib/ledger";
import type { ActionResult } from "@/lib/actions";

/**
 * Register a new account and roll its hero in one step. The account name is
 * also the hero name. Passwords are hashed with bcrypt; the browser only ever
 * holds a random session token.
 */
export async function register(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const cls = String(formData.get("class") ?? "") as CharClass;

  if (name.length < 2 || name.length > 20) {
    return { ok: false, message: "Name must be 2–20 characters." };
  }
  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }
  if (!["WARRIOR", "MAGE", "SCOUT"].includes(cls)) {
    return { ok: false, message: "Please choose a class." };
  }
  if (await prisma.player.findUnique({ where: { name } })) {
    return { ok: false, message: "That name is already taken, hero." };
  }

  const base = getClass(cls).base;
  const passwordHash = await bcrypt.hash(password, 10);
  const token = newSessionToken();

  const player = await prisma.player.create({
    data: {
      name,
      passwordHash,
      sessionToken: token,
      character: {
        create: {
          name,
          class: cls,
          strength: base.strength,
          dexterity: base.dexterity,
          intelligence: base.intelligence,
          constitution: base.constitution,
          luck: base.luck,
        },
      },
    },
    include: { character: true },
  });

  // Stock the hero's personal Magic Shop, and open the currency ledger with the
  // starting grant so sum(deltas) always reconciles to the cached balance.
  if (player.character) {
    const c = player.character;
    await prisma.$transaction([
      prisma.item.createMany({
        data: generateShopStock(makeRng(randomSeed()), 1).map((it) => ({
          ...it,
          characterId: c.id,
          location: "SHOP",
        })),
      }),
      ...currencyLedgerOps(
        c.id,
        { gold: 0, mushrooms: 0 },
        { gold: c.gold, mushrooms: c.mushrooms },
        "SIGNUP_GRANT",
      ),
    ]);
  }

  await setSessionToken(token);
  revalidatePath("/");
  return { ok: true, message: `Welcome to the realm, ${name}!` };
}

/** Log into an existing account. Issues a fresh session token on success. */
export async function login(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const player = await prisma.player.findUnique({ where: { name } });
  if (
    !player?.passwordHash ||
    !(await bcrypt.compare(password, player.passwordHash))
  ) {
    return { ok: false, message: "Invalid name or password." };
  }

  const token = newSessionToken();
  await prisma.player.update({
    where: { id: player.id },
    data: { sessionToken: token },
  });

  await setSessionToken(token);
  revalidatePath("/");
  return { ok: true, message: `Welcome back, ${name}!` };
}

/** Log out: invalidate the session token on the server and clear the cookie. */
export async function logout(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    await prisma.player.updateMany({
      where: { sessionToken: token },
      data: { sessionToken: null },
    });
  }
  await clearSession();
  revalidatePath("/");
}
