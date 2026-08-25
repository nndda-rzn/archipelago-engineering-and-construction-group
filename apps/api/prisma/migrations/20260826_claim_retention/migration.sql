-- AlterTable
ALTER TABLE "ProgressClaim" ADD COLUMN     "netCertifiedAmount" DECIMAL(18,2),
ADD COLUMN     "retentionAmount" DECIMAL(18,2),
ADD COLUMN     "retentionRate" DECIMAL(5,2) NOT NULL DEFAULT 0;
