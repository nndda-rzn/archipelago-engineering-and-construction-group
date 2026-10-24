-- Backfill planned value (PV) dan budget control account dari budget WBS.
--
-- Sebelumnya `ControlAccount.budgetAmount` dan `plannedValue` dibuat 0 oleh seed,
-- sehingga `spi = ev / pv` tidak terdefinisi (pv = 0) dan 3 dari 4 control
-- account pada proyek unggulan ditandai `dataIssue`. Halaman Project Controls
-- kehilangan seluruh zona trajektori untuk proyek yang PV-nya nol.
--
-- PENTING — hubungannya BUKAN 1:1. Sebagian proyek punya 5 control account untuk
-- 4 WBS, artinya ada WBS yang ditautkan dua CA. Memberi PV penuh kepada keduanya
-- membuat total PV melebihi BAC (terukur: PRJ-020 menjadi 2,96 T vs BAC 1,85 T),
-- yang justru merusak SPI dengan cara lain.
--
-- Aturan yang dipakai: budget sebuah WBS diberikan kepada SATU control account
-- saja — yang kodenya paling kecil — sehingga total PV tidak pernah melebihi
-- BAC. CA lain yang menautkan WBS yang sama tetap 0 dan `dataIssue`-nya menyala,
-- karena memang belum punya nilai rencana sendiri; itu fakta, bukan cacat.
--
-- Idempoten: hanya mengisi baris yang PV-nya masih 0, dan hanya untuk CA yang
-- merupakan pemegang pertama WBS tersebut.

WITH wbs_budget AS (
  SELECT "wbsItemId", sum(amount) AS total
  FROM "BudgetItem"
  WHERE status = 'PUBLISHED'
  GROUP BY "wbsItemId"
  HAVING sum(amount) > 0
),
first_holder AS (
  SELECT DISTINCT ON (ca."wbsItemId") ca.id
  FROM "ControlAccount" ca
  JOIN wbs_budget b ON b."wbsItemId" = ca."wbsItemId"
  ORDER BY ca."wbsItemId", ca.code ASC
)
UPDATE "ControlAccount" ca
SET "plannedValue" = b.total,
    "budgetAmount" = b.total
FROM wbs_budget b, first_holder f
WHERE ca.id = f.id
  AND ca."wbsItemId" = b."wbsItemId"
  AND ca."plannedValue" = 0;
