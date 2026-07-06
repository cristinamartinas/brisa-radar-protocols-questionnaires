import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma 7 uses driver adapters. We talk to the local SQLite file through
// the better-sqlite3 adapter. DATABASE_URL ("file:./dev.db") resolves
// relative to the project root, which is the cwd for both the Prisma CLI
// and the Next.js runtime, so the two always agree on the same file.
const url = process.env.DATABASE_URL ?? "file:./dev.db";

// Reuse a single PrismaClient across hot reloads in development to avoid
// exhausting connections / re-opening the database file.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
