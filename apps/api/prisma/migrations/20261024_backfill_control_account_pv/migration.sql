-- Backfill planned value (PV) dan budget control account dari budget WBS.
--
-- Sebelumnya `ControlAccount.budgetAmount` dan `plannedValue` dibuat 0 oleh seed.
-- Akibatnya `spi = ev / pv` tidak terdefinisi (pv = 0), dan
-- `ControlAccountService` menandai 3 dari 4 CA sebagai `dataIssue` pada proyek
-- unggulan — halaman Project Controls kehilangan seluruh zona trajektori.
--
-- Hubungannya 1:1: satu control account menautkan tepat satu WBS (diverifikasi
-- pada 12 proyek: jumlah CA sama dengan jumlah WBS unik per proyek). Maka
-- PV(CA) = total budget PUBLISHED milik WBS itu. Tidak ada pembagian yang
-- dikarang; kalau sebuah WBS tidak punya budget, PV-nya tetap 0 dan `dataIssue`
-- memang seharusnya menyala.
--
-- Idempoten: hanya mengisi baris yang PV-nya masih 0 dan WBS-nya punya budget.

UPDATE "ControlAccount" ca
SET "plannedValue" = b.total,
    "budgetAmount" = b.total
FROM (
  SELECT "wbsItemId", sum(amount) AS total
  FROM "BudgetItem"
  WHERE status = 'PUBLISHED'
  GROUP BY "wbsItemId"
) b
WHERE ca."wbsItemId" = b."wbsItemId"
  AND ca."plannedValue" = 0
  AND b.total > 0;
