-- AlterTable
ALTER TABLE "ProgressClaim" ADD COLUMN     "claimType" TEXT NOT NULL DEFAULT 'PROGRESS',
ADD COLUMN     "requestedExtensionDays" INTEGER;

-- CreateIndex
CREATE INDEX "ProgressClaim_claimType_idx" ON "ProgressClaim"("claimType");
