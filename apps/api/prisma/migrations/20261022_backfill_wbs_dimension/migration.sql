-- Backfill dimensi WBS untuk biaya material.
--
-- Semua baris `StockLedgerEntry` adalah pergerakan material (GR / ISSUE /
-- ADJUSTMENT), dan baris jurnal akun 610* adalah beban material. Keduanya
-- dialokasikan ke WBS material (kode '2'), bukan dibagi rata ke seluruh WBS —
-- membagi rata akan mengarang angka. WBS non-material memang tetap 0 dan itu
-- ditampilkan apa adanya lewat `costCoverage`.
--
-- Idempoten: hanya menyentuh baris yang dimensinya masih NULL, jadi aman
-- dijalankan berulang dan tidak menimpa alokasi yang kelak diisi manual.

UPDATE "StockLedgerEntry" sle
SET "wbsItemId" = w.id
FROM "WbsItem" w
WHERE sle."wbsItemId" IS NULL
  AND w."projectId" = sle."projectId"
  AND w."code" = '2';

UPDATE "JournalLine" jl
SET "wbsItemId" = w.id
FROM "Journal" j, "ChartOfAccount" a, "WbsItem" w
WHERE jl."wbsItemId" IS NULL
  AND jl."journalId" = j.id
  AND jl."accountId" = a.id
  AND a."code" LIKE '610%'
  AND w."projectId" = jl."projectId"
  AND w."code" = '2';
