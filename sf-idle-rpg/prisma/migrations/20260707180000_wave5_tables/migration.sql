-- CreateTable
CREATE TABLE "BountyState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "claimed" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BountyState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiceState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "rolls" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "biggestWin" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiceState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyShopState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyShopState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BountyState_characterId_key" ON "BountyState"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "DiceState_characterId_key" ON "DiceState"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyShopState_characterId_key" ON "DailyShopState"("characterId");

-- AddForeignKey
ALTER TABLE "BountyState" ADD CONSTRAINT "BountyState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiceState" ADD CONSTRAINT "DiceState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyShopState" ADD CONSTRAINT "DailyShopState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

