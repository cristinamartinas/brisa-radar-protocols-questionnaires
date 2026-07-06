-- CreateTable
CREATE TABLE "ActiveQuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goldReward" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "mushroomReward" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    CONSTRAINT "ActiveQuest_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ActiveQuest_characterId_key" ON "ActiveQuest"("characterId");
