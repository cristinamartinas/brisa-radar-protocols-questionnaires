-- Add authentication fields to Player
ALTER TABLE "Player" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Player" ADD COLUMN "sessionToken" TEXT;

-- Unique session token (multiple NULLs allowed in SQLite)
CREATE UNIQUE INDEX "Player_sessionToken_key" ON "Player"("sessionToken");
