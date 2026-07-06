import { cookies } from "next/headers";

// Minimal cookie-based session. A real deployment would swap this for
// NextAuth / Auth.js, but a signed httpOnly cookie is enough to tie a
// browser to its hero for now.
const COOKIE = "sf_pid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getPlayerId(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function setPlayerId(id: string): Promise<void> {
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function clearPlayer(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
