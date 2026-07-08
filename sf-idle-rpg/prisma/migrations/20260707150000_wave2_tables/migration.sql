-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "skillLoadout" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "TowerState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "highestFloor" INTEGER NOT NULL DEFAULT 0,
    "currentFloor" INTEGER NOT NULL DEFAULT 1,
    "runStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TowerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldBoss" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '👹',
    "level" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "spawnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defeatedAt" TIMESTAMP(3),

    CONSTRAINT "WorldBoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldBossHit" (
    "id" TEXT NOT NULL,
    "worldBossId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "damage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorldBossHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildRoom" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "GuildRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TowerState_characterId_key" ON "TowerState"("characterId");

-- CreateIndex
CREATE INDEX "WorldBoss_active_idx" ON "WorldBoss"("active");

-- CreateIndex
CREATE INDEX "WorldBossHit_worldBossId_characterId_idx" ON "WorldBossHit"("worldBossId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildRoom_guildId_room_key" ON "GuildRoom"("guildId", "room");

-- AddForeignKey
ALTER TABLE "TowerState" ADD CONSTRAINT "TowerState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldBossHit" ADD CONSTRAINT "WorldBossHit_worldBossId_fkey" FOREIGN KEY ("worldBossId") REFERENCES "WorldBoss"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldBossHit" ADD CONSTRAINT "WorldBossHit_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRoom" ADD CONSTRAINT "GuildRoom_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

