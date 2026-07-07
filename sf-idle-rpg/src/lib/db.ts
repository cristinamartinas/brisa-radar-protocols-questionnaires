import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 uses driver adapters. We talk to Postgres through the pg adapter.
// DATABASE_URL is a standard Postgres connection string (see .env.example);
// locally that can be a dev Postgres, in production a hosted one (Neon/Supabase).
const connectionString = process.env.DATABASE_URL;

// Reuse a single PrismaClient across hot reloads / warm serverless invocations
// to avoid exhausting the connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
