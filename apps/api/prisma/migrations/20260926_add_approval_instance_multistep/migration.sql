-- F7 (multi-step approval): satukan rangkaian step satu transaksi ke dalam ApprovalInstance.
--
-- Sebelumnya ApprovalTask unik per (transactionType, transactionId) sehingga hanya SATU
-- step mungkin tersimpan; submit mengambil step pertama dan keputusan pertama langsung
-- final. Migrasi ini menambah ApprovalInstance (1 per dokumen) dan mengubah ApprovalTask
-- menjadi 1 task per step, lalu memindahkan task lama menjadi instance satu-step.

-- 1) Tabel instance
CREATE TABLE "ApprovalInstance" (
    "id" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionCode" TEXT,
    "definitionId" TEXT,
    "definitionVersion" INTEGER,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
    "stepPlan" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalInstance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApprovalInstance_transactionType_transactionId_key"
  ON "ApprovalInstance"("transactionType", "transactionId");
CREATE INDEX "ApprovalInstance_status_idx" ON "ApprovalInstance"("status");

-- 2) Kolom baru pada ApprovalTask, awalnya NULL supaya bisa di-backfill.
ALTER TABLE "ApprovalTask" ADD COLUMN "instanceId" TEXT;
ALTER TABLE "ApprovalTask" ADD COLUMN "stepOrder" INTEGER NOT NULL DEFAULT 1;

-- 3) Backfill: setiap task lama menjadi satu instance satu-step.
--    id dibuat deterministik dari id task (md5) agar aman diulang & tidak butuh ekstensi.
INSERT INTO "ApprovalInstance" (
  "id", "transactionType", "transactionId", "transactionCode",
  "requesterId", "status", "currentStepOrder", "stepPlan",
  "startedAt", "completedAt", "createdAt", "updatedAt"
)
SELECT
  'ai_' || md5(t."id"),
  t."transactionType",
  t."transactionId",
  t."transactionCode",
  t."requesterId",
  CASE WHEN t."status" = 'PENDING' THEN 'PENDING' ELSE t."status" END,
  1,
  jsonb_build_array(jsonb_build_object(
    'stepOrder', 1,
    'name', t."stepName",
    'approverRoleCode', t."approverRoleCode"
  )),
  t."createdAt",
  t."decidedAt",
  t."createdAt",
  t."updatedAt"
FROM "ApprovalTask" t;

UPDATE "ApprovalTask" t
SET "instanceId" = 'ai_' || md5(t."id")
WHERE t."instanceId" IS NULL;

ALTER TABLE "ApprovalTask" ALTER COLUMN "instanceId" SET NOT NULL;

-- 4) Unique lama per-transaksi diganti unique per-(instance, step); keunikan per
--    transaksi sekarang dijaga oleh ApprovalInstance.
DROP INDEX "ApprovalTask_transactionType_transactionId_key";
CREATE UNIQUE INDEX "ApprovalTask_instanceId_stepOrder_key"
  ON "ApprovalTask"("instanceId", "stepOrder");

-- 5) Foreign key cascade
ALTER TABLE "ApprovalTask"
  ADD CONSTRAINT "ApprovalTask_instanceId_fkey"
  FOREIGN KEY ("instanceId") REFERENCES "ApprovalInstance"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
