-- Syarat majemuk (AND/OR) per langkah approval.
--
-- Sebelumnya satu langkah hanya bisa punya SATU syarat (conditionField/Op/Value),
-- sehingga rentang seperti "di atas 5 juta DAN sampai 50 juta" tidak bisa
-- diekspresikan. Kolom `conditionGroup` menampung daftar aturan dengan penghubung.
--
-- Aditif dan backwards-compatible:
-- - `conditionGroup` NULL berarti langkah memakai kolom tunggal lama (data lama
--   tetap sah dan tetap dievaluasi persis seperti sebelumnya);
-- - kolom tunggal tetap ditulis sebagai cerminan aturan pertama, sehingga pembaca
--   yang belum mengenal grup tidak kehilangan makna langkah.

-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN "conditionGroup" JSONB;
