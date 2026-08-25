-- AlterTable
ALTER TABLE "ProgressClaim" ADD COLUMN     "cumulativeRecovered" DECIMAL(18,2),
ADD COLUMN     "recoveryAmount" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "advanceAmount" DECIMAL(18,2),
ADD COLUMN     "advanceRecoveryRate" DECIMAL(5,2) NOT NULL DEFAULT 0;