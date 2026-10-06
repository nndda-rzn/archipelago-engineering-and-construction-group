-- Definisi mana yang MEMBUAT sebuah approval task.
--
-- Sebelumnya `ApprovalTask` hanya menyimpan `transactionType`, sehingga insight
-- dihitung per JENIS TRANSAKSI dan mencampur semua versi. Pertanyaan "versi mana
-- yang dipakai dokumen ini" tidak bisa dijawab sama sekali.
--
-- Aditif dan aman:
-- - `definitionId` NULLABLE: task lama (dibuat sebelum kolom ini ada) dan submit
--   manual tanpa workflow memang tidak punya definisi;
-- - `ON DELETE SET NULL`: menghapus definisi tidak boleh menghapus jejak approval.

-- AlterTable
ALTER TABLE "ApprovalTask" ADD COLUMN     "definitionId" TEXT;

-- CreateIndex
CREATE INDEX "ApprovalTask_definitionId_idx" ON "ApprovalTask"("definitionId");

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Backfill berbasis bukti ──────────────────────────────────────────────────
-- Isi `definitionId` HANYA bila tanda tangan langkah task cocok PERSIS dengan
-- sebuah langkah di definisi ACTIVE untuk jenis transaksi yang sama, dan
-- kecocokan itu TUNGGAL (tidak ambigu antara dua definisi).
--
-- Tanda tangan = (stepOrder, stepName, approverRoleCode). Ketiganya dipakai
-- karena `stepOrder` saja tidak cukup (versi berbeda punya urutan mirip) dan
-- `stepName` saja tidak cukup (nama bisa sama antar versi).
--
-- Task yang tidak punya kecocokan tunggal DIBIARKAN NULL — ditampilkan UI sebagai
-- "versi tidak diketahui". Menebak akan menempelkan dokumen ke versi yang
-- mungkin belum ada saat dokumen itu diajukan, dan itu lebih buruk daripada jujur.
UPDATE "ApprovalTask" AS t
SET "definitionId" = m."definitionId"
FROM (
  SELECT
    t2.id              AS task_id,
    MIN(d.id)          AS "definitionId",
    COUNT(DISTINCT d.id) AS matches
  FROM "ApprovalTask" AS t2
  JOIN "WorkflowDefinition" AS d
    ON d."transactionType" = t2."transactionType"
   AND d.status = 'ACTIVE'
  JOIN "WorkflowStep" AS s
    ON s."definitionId" = d.id
   AND s."stepOrder" = t2."stepOrder"
   AND s.name = t2."stepName"
   AND s."approverRoleCode" = t2."approverRoleCode"
  WHERE t2."definitionId" IS NULL
  GROUP BY t2.id
  HAVING COUNT(DISTINCT d.id) = 1
) AS m
WHERE t.id = m.task_id;
