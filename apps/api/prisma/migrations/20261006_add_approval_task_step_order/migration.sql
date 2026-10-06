-- Rantai approval berjenjang: satu task per LANGKAH, bukan satu per dokumen.
--
-- Sebelumnya `ApprovalTask` unik per (transactionType, transactionId), sehingga
-- langkah kedua tidak mungkin dibuat — workflow berjenjang (mis. Manager lalu
-- Direksi) tidak pernah dieksekusi. Kolom `stepOrder` menandai langkah ke berapa
-- dan unique key diperluas ke tiga kolom.
--
-- Baris lama tetap sah: `stepOrder` default 1.

-- DropIndex
DROP INDEX "ApprovalTask_transactionType_transactionId_key";

-- AlterTable
ALTER TABLE "ApprovalTask" ADD COLUMN     "stepOrder" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "ApprovalTask_transactionType_transactionId_idx" ON "ApprovalTask"("transactionType", "transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalTask_transactionType_transactionId_stepOrder_key" ON "ApprovalTask"("transactionType", "transactionId", "stepOrder");
