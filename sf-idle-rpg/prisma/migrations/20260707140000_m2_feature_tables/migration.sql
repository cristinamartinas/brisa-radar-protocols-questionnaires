-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "dust" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Talent" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "node" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterAchievement" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastClaimDay" TEXT,
    "tasksClaimed" TEXT NOT NULL DEFAULT '[]',
    "loginClaimed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Talent_characterId_node_key" ON "Talent"("characterId", "node");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAchievement_characterId_key_key" ON "CharacterAchievement"("characterId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "DailyState_characterId_key" ON "DailyState"("characterId");

-- AddForeignKey
ALTER TABLE "Talent" ADD CONSTRAINT "Talent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAchievement" ADD CONSTRAINT "CharacterAchievement_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyState" ADD CONSTRAINT "DailyState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

