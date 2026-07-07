-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "sessionToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 100,
    "mushrooms" INTEGER NOT NULL DEFAULT 10,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "dexterity" INTEGER NOT NULL DEFAULT 10,
    "intelligence" INTEGER NOT NULL DEFAULT 10,
    "constitution" INTEGER NOT NULL DEFAULT 10,
    "luck" INTEGER NOT NULL DEFAULT 5,
    "arenaWins" INTEGER NOT NULL DEFAULT 0,
    "arenaLosses" INTEGER NOT NULL DEFAULT 0,
    "guildId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyLedger" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "founderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DungeonProgress" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "dungeonKey" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "clearedAt" TIMESTAMP(3),

    CONSTRAINT "DungeonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveQuest" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goldReward" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "mushroomReward" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL,
    "seed" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'SHOP',
    "strength" INTEGER NOT NULL DEFAULT 0,
    "dexterity" INTEGER NOT NULL DEFAULT 0,
    "intelligence" INTEGER NOT NULL DEFAULT 0,
    "constitution" INTEGER NOT NULL DEFAULT 0,
    "luck" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestLog" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goldReward" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleLog" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "opponentName" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "goldChange" INTEGER NOT NULL,
    "rounds" TEXT NOT NULL,
    "seed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_sessionToken_key" ON "Player"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Character_playerId_key" ON "Character"("playerId");

-- CreateIndex
CREATE INDEX "CurrencyLedger_characterId_createdAt_idx" ON "CurrencyLedger"("characterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DungeonProgress_characterId_dungeonKey_key" ON "DungeonProgress"("characterId", "dungeonKey");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveQuest_characterId_key" ON "ActiveQuest"("characterId");

-- CreateIndex
CREATE INDEX "Item_characterId_location_idx" ON "Item"("characterId", "location");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrencyLedger" ADD CONSTRAINT "CurrencyLedger_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DungeonProgress" ADD CONSTRAINT "DungeonProgress_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveQuest" ADD CONSTRAINT "ActiveQuest_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestLog" ADD CONSTRAINT "QuestLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleLog" ADD CONSTRAINT "BattleLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

