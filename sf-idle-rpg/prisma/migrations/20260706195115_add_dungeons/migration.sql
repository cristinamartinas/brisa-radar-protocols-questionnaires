-- CreateTable
CREATE TABLE "DungeonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "dungeonKey" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "clearedAt" DATETIME,
    CONSTRAINT "DungeonProgress_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DungeonProgress_characterId_dungeonKey_key" ON "DungeonProgress"("characterId", "dungeonKey");
