-- AlterTable
ALTER TABLE "ProgressClaim" ADD COLUMN     "billableProgress" DECIMAL(5,2),
ADD COLUMN     "physicalProgressAtClaim" DECIMAL(5,2),
ADD COLUMN     "workPackageId" TEXT;

-- CreateIndex
CREATE INDEX "ProgressClaim_workPackageId_idx" ON "ProgressClaim"("workPackageId");

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "ConstructionWorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
