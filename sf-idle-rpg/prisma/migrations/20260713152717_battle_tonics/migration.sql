-- CreateTable
CREATE TABLE "TonicState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "berserk" INTEGER NOT NULL DEFAULT 0,
    "ironhide" INTEGER NOT NULL DEFAULT 0,
    "fortune" INTEGER NOT NULL DEFAULT 0,
    "armed" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TonicState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TonicState_characterId_key" ON "TonicState"("characterId");

-- AddForeignKey
ALTER TABLE "TonicState" ADD CONSTRAINT "TonicState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

