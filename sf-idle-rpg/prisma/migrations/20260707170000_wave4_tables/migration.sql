-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "banner" TEXT,
ADD COLUMN     "frameColor" TEXT;

-- CreateTable
CREATE TABLE "SeasonPassState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "season" TEXT NOT NULL DEFAULT 'season-1',
    "claimed" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonPassState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expedition" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "rewardGold" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL,
    "rewardDust" INTEGER NOT NULL DEFAULT 0,
    "seed" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expedition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FishingState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "lastCast" TIMESTAMP(3),
    "totalCatches" INTEGER NOT NULL DEFAULT 0,
    "bestCatch" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FishingState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonPassState_characterId_key" ON "SeasonPassState"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Expedition_characterId_key" ON "Expedition"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "FishingState_characterId_key" ON "FishingState"("characterId");

-- AddForeignKey
ALTER TABLE "SeasonPassState" ADD CONSTRAINT "SeasonPassState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expedition" ADD CONSTRAINT "Expedition_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FishingState" ADD CONSTRAINT "FishingState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

