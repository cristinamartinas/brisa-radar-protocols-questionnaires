-- Store the RNG seed so fights and quest rolls are reproducible/auditable
ALTER TABLE "BattleLog" ADD COLUMN "seed" TEXT;
ALTER TABLE "ActiveQuest" ADD COLUMN "seed" TEXT;
