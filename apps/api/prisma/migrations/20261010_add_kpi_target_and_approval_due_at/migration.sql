-- AlterTable
ALTER TABLE "ApprovalTask" ADD COLUMN     "dueAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "KpiTarget" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "metric" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "target" DECIMAL(18,2) NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'MIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KpiTarget_metric_period_idx" ON "KpiTarget"("metric", "period");

-- CreateIndex
CREATE UNIQUE INDEX "KpiTarget_legalEntityId_metric_period_key" ON "KpiTarget"("legalEntityId", "metric", "period");

-- CreateIndex
CREATE INDEX "ApprovalTask_status_dueAt_idx" ON "ApprovalTask"("status", "dueAt");

-- AddForeignKey
ALTER TABLE "KpiTarget" ADD CONSTRAINT "KpiTarget_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Backfill `dueAt` (FR-DASH-002) ───────────────────────────────────────────
-- Task PENDING yang belum punya tenggat diberi SLA default 7 hari dari saat
-- dibuat. Task lama/deskriptif tetap punya nilai yang masuk akal untuk dihitung
-- "overdue berapa hari" di dashboard, tanpa mengarang tenggat yang mustahil.
-- Task yang sudah selesai (bukan PENDING) sengaja dibiarkan NULL: SLA hanya
-- bermakna untuk yang masih menunggu.
UPDATE "ApprovalTask"
SET "dueAt" = "createdAt" + INTERVAL '7 days'
WHERE "status" = 'PENDING' AND "dueAt" IS NULL;

