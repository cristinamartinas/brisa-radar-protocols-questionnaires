import { cookies } from "next/headers";

// Session is a random, unguessable token stored on the Player row and mirrored
// in an httpOnly cookie. Looking a player up by token (rather than by id) means
// the cookie can't be forged just by knowing someone's account id.
const COOKIE = "sf_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS-only in production; left off in dev so http://localhost still works.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Generate a fresh session token. */
export function newSessionToken(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}
