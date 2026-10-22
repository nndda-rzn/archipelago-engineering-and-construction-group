-- CreateTable
CREATE TABLE "BudgetBaseline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "label" TEXT,
    "reason" TEXT,
    "frozenAt" TIMESTAMP(3),
    "frozenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetBaselineLine" (
    "id" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "wbsItemId" TEXT NOT NULL,
    "costType" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "BudgetBaselineLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetBaseline_projectId_status_idx" ON "BudgetBaseline"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetBaseline_projectId_version_key" ON "BudgetBaseline"("projectId", "version");

-- CreateIndex
CREATE INDEX "BudgetBaselineLine_baselineId_idx" ON "BudgetBaselineLine"("baselineId");

-- CreateIndex
CREATE INDEX "BudgetBaselineLine_wbsItemId_idx" ON "BudgetBaselineLine"("wbsItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetBaselineLine_baselineId_wbsItemId_costType_key" ON "BudgetBaselineLine"("baselineId", "wbsItemId", "costType");

-- AddForeignKey
ALTER TABLE "BudgetBaseline" ADD CONSTRAINT "BudgetBaseline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetBaselineLine" ADD CONSTRAINT "BudgetBaselineLine_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "BudgetBaseline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetBaselineLine" ADD CONSTRAINT "BudgetBaselineLine_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WbsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: setiap proyek yang sudah punya budget PUBLISHED mendapat baseline
-- v1 FROZEN. Idempoten lewat NOT EXISTS, sehingga aman dijalankan ulang.
INSERT INTO "BudgetBaseline" ("id", "projectId", "version", "status", "label", "frozenAt", "frozenBy", "createdAt", "updatedAt")
SELECT
  'bl_' || p."id" || '_1',
  p."id",
  1,
  'FROZEN',
  'Migrated baseline',
  NOW(),
  'migration',
  NOW(),
  NOW()
FROM "Project" p
WHERE EXISTS (
    SELECT 1 FROM "BudgetItem" b
    WHERE b."projectId" = p."id" AND b."status" = 'PUBLISHED'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "BudgetBaseline" bb
    WHERE bb."projectId" = p."id" AND bb."version" = 1
  );

INSERT INTO "BudgetBaselineLine" ("id", "baselineId", "wbsItemId", "costType", "amount")
SELECT
  'bll_' || b."id",
  'bl_' || b."projectId" || '_1',
  b."wbsItemId",
  b."costType",
  b."amount"
FROM "BudgetItem" b
WHERE b."status" = 'PUBLISHED'
  AND EXISTS (
    SELECT 1 FROM "BudgetBaseline" bb
    WHERE bb."projectId" = b."projectId" AND bb."version" = 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM "BudgetBaselineLine" l
    WHERE l."baselineId" = 'bl_' || b."projectId" || '_1'
      AND l."wbsItemId" = b."wbsItemId"
      AND l."costType" = b."costType"
  );
