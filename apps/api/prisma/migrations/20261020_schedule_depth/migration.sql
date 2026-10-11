-- Schedule depth (FR-PRJ-004): dependency, baseline, critical path, jadwal WBS.
--
-- ADITIF penuh: enum baru + kolom nullable/ber-DEFAULT. Baris lama tetap valid.

-- 1) Enum tipe ketergantungan
CREATE TYPE "DependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF');

-- 2) WBS: jadwal rencana
ALTER TABLE "WbsItem" ADD COLUMN "plannedStart" TIMESTAMP(3);
ALTER TABLE "WbsItem" ADD COLUMN "plannedEnd" TIMESTAMP(3);

-- 3) ControlAccount: baseline, dependency, critical path, progress
ALTER TABLE "ControlAccount" ADD COLUMN "baselineStart" TIMESTAMP(3);
ALTER TABLE "ControlAccount" ADD COLUMN "baselineEnd" TIMESTAMP(3);
ALTER TABLE "ControlAccount" ADD COLUMN "predecessorId" TEXT;
ALTER TABLE "ControlAccount" ADD COLUMN "dependencyType" "DependencyType" NOT NULL DEFAULT 'FS';
ALTER TABLE "ControlAccount" ADD COLUMN "lagDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ControlAccount" ADD COLUMN "isCriticalPath" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ControlAccount" ADD COLUMN "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "ControlAccount" ADD CONSTRAINT "ControlAccount_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ControlAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ControlAccount_predecessorId_idx" ON "ControlAccount"("predecessorId");

-- 4) ConstructionWorkPackage: baseline, dependency, critical path
ALTER TABLE "ConstructionWorkPackage" ADD COLUMN "baselineStart" TIMESTAMP(3);
ALTER TABLE "ConstructionWorkPackage" ADD COLUMN "baselineEnd" TIMESTAMP(3);
ALTER TABLE "ConstructionWorkPackage" ADD COLUMN "predecessorId" TEXT;
ALTER TABLE "ConstructionWorkPackage" ADD COLUMN "dependencyType" "DependencyType" NOT NULL DEFAULT 'FS';
ALTER TABLE "ConstructionWorkPackage" ADD COLUMN "lagDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ConstructionWorkPackage" ADD COLUMN "isCriticalPath" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConstructionWorkPackage" ADD CONSTRAINT "ConstructionWorkPackage_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ConstructionWorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ConstructionWorkPackage_predecessorId_idx" ON "ConstructionWorkPackage"("predecessorId");
