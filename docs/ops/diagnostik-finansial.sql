-- ============================================================================
-- Diagnostik Finansial — PR-F1 (baca-saja)
-- ============================================================================
--
-- Tujuan: memperoleh bukti kondisi nyata sebelum/sesudah perbaikan invariant.
-- Menjawab temuan T1–T7 di [[Financial-Integrity-Mitigation-Plan]] §2.
--
-- TIDAK ADA SATU PUN PERUBAHAN DATA. Seluruh berkas hanya SELECT.
-- Penjaga eksplisit: transaksi ditandai read-only sehingga UPDATE/INSERT/DELETE
-- akan gagal keras bila suatu saat ditambahkan tanpa sengaja.
SET default_transaction_read_only = on;

-- ----------------------------------------------------------------------------
-- CARA PAKAI
--
--   psql "$SNAPSHOT_URL" -f docs/ops/diagnostik-finansial.sql
--
-- WAJIB dijalankan pada SALINAN/SNAPSHOT produksi, bukan database produksi
-- langsung (plan §4 PR-F1 langkah 1). `prisma db execute` bisa menjalankan berkas
-- ini tetapi TIDAK menampilkan baris hasil, jadi pakai psql untuk melihat bukti.
--
-- Nama tabel/kolom mengikuti baseline Prisma (PascalCase, tanpa @@map) dan sudah
-- diverifikasi terhadap apps/api/prisma/schema.prisma.
--
-- Interpretasi penting:
--   * Setiap query mengembalikan baris HANYA bila ada pelanggaran (kecuali
--     ditandai "inventaris", yang memang selalu mengembalikan baris).
--   * Hasil KOSONG = tidak ada pelanggaran pada snapshot itu.
--   * D-1/D-2/D-3/D-4 hanya menandai status yang SUDAH SEHARUSNYA berjurnal.
--     Lihat bagian A untuk memisahkan status yang memang belum waktunya
--     berjurnal (mis. Payment APPROVED memang bukan anomali).
-- ----------------------------------------------------------------------------


-- ############################################################################
-- A. T1 — Dokumen final tanpa jurnal
--
-- Jalur posting yang seharusnya menghasilkan jurnal:
--   VendorInvoice  POSTED              -> source 'INVOICE'
--   Payment        PAID                -> source 'PAYMENT'         (APPROVED belum berjurnal)
--   ClientInvoice  POSTED              -> source 'CLIENT_INVOICE'
--   Collection     POSTED              -> source 'COLLECTION'
--
-- D-1/D-2/D-3/D-4 di bawah sudah memakai status yang benar. A-0 menampilkan
-- matriks status x ada/tidak jurnal agar status yang belum waktunya berjurnal
-- dapat dipisahkan tanpa menebak.
-- ############################################################################

-- A-0 (inventaris) Matriks status x keberadaan jurnal untuk keempat dokumen.
--     Baca kolom `tanpa_jurnal` relatif terhadap `status`:
--       Payment APPROVED / VendorInvoice DRAFT|MATCHED dst memang TIDAK diharapkan berjurnal.
SELECT 'VendorInvoice' AS dokumen, vi.status, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE j.id IS NULL) AS tanpa_jurnal
FROM "VendorInvoice" vi
LEFT JOIN "Journal" j ON j.source = 'INVOICE' AND j."sourceId" = vi.id
GROUP BY vi.status
UNION ALL
SELECT 'Payment', p.status, COUNT(*),
       COUNT(*) FILTER (WHERE j.id IS NULL)
FROM "Payment" p
LEFT JOIN "Journal" j ON j.source = 'PAYMENT' AND j."sourceId" = p.id
GROUP BY p.status
UNION ALL
SELECT 'ClientInvoice', ci.status, COUNT(*),
       COUNT(*) FILTER (WHERE j.id IS NULL)
FROM "ClientInvoice" ci
LEFT JOIN "Journal" j ON j.source = 'CLIENT_INVOICE' AND j."sourceId" = ci.id
GROUP BY ci.status
UNION ALL
SELECT 'Collection', c.status, COUNT(*),
       COUNT(*) FILTER (WHERE j.id IS NULL)
FROM "Collection" c
LEFT JOIN "Journal" j ON j.source = 'COLLECTION' AND j."sourceId" = c.id
GROUP BY c.status
ORDER BY dokumen, status;

-- A-1 T1 | Payment PAID tanpa jurnal (anomali: uang sudah keluar, buku kosong)
SELECT p.id, p."paymentNumber", p."projectId", p."totalAmount", p.status,
       p."paymentDate", p."approvedAt", p."createdAt"
FROM "Payment" p
LEFT JOIN "Journal" j ON j.source = 'PAYMENT' AND j."sourceId" = p.id
WHERE p.status = 'PAID' AND j.id IS NULL
ORDER BY p."paymentDate";

-- A-2 T1 | Vendor invoice POSTED tanpa jurnal
SELECT vi.id, vi."invoiceNumber", vi."poId", vi."projectId", vi."totalAmount",
       vi.status, vi."postedAt", vi."createdAt"
FROM "VendorInvoice" vi
LEFT JOIN "Journal" j ON j.source = 'INVOICE' AND j."sourceId" = vi.id
WHERE vi.status = 'POSTED' AND j.id IS NULL
ORDER BY vi."postedAt";

-- A-3 T1 | Client invoice POSTED tanpa jurnal
SELECT ci.id, ci."invoiceNumber", ci."projectId", ci."claimId", ci."totalAmount",
       ci.status, ci."postedAt", ci."createdAt"
FROM "ClientInvoice" ci
LEFT JOIN "Journal" j ON j.source = 'CLIENT_INVOICE' AND j."sourceId" = ci.id
WHERE ci.status = 'POSTED' AND j.id IS NULL
ORDER BY ci."postedAt";

-- A-4 T1 | Collection POSTED tanpa jurnal
SELECT c.id, c."collectionNumber", c."projectId", c."totalAmount", c.status,
       c."collectedAt", c."createdAt"
FROM "Collection" c
LEFT JOIN "Journal" j ON j.source = 'COLLECTION' AND j."sourceId" = c.id
WHERE c.status = 'POSTED' AND j.id IS NULL
ORDER BY c."collectedAt";

-- A-5 T1 (+) | Ringkasan per legal entity + rentang tanggal, untuk tabel bukti
SELECT src.dokumen,
       le.code AS legal_entity,
       COUNT(*) AS jumlah_dokumen,
       MIN(src.tanggal) AS tanggal_terawal,
       MAX(src.tanggal) AS tanggal_terakhir,
       SUM(src.nilai) AS total_nilai
FROM (
  SELECT 'Payment' AS dokumen, pr."legalEntityId" AS legal_entity_id, p."paymentDate" AS tanggal, p."totalAmount" AS nilai
  FROM "Payment" p
  JOIN "Project" pr ON pr.id = p."projectId"
  LEFT JOIN "Journal" j ON j.source = 'PAYMENT' AND j."sourceId" = p.id
  WHERE p.status = 'PAID' AND j.id IS NULL
  UNION ALL
  SELECT 'VendorInvoice', pr."legalEntityId", vi."postedAt", vi."totalAmount"
  FROM "VendorInvoice" vi
  JOIN "Project" pr ON pr.id = vi."projectId"
  LEFT JOIN "Journal" j ON j.source = 'INVOICE' AND j."sourceId" = vi.id
  WHERE vi.status = 'POSTED' AND j.id IS NULL
  UNION ALL
  SELECT 'ClientInvoice', pr."legalEntityId", ci."postedAt", ci."totalAmount"
  FROM "ClientInvoice" ci
  JOIN "Project" pr ON pr.id = ci."projectId"
  LEFT JOIN "Journal" j ON j.source = 'CLIENT_INVOICE' AND j."sourceId" = ci.id
  WHERE ci.status = 'POSTED' AND j.id IS NULL
  UNION ALL
  SELECT 'Collection', pr."legalEntityId", c."collectedAt", c."totalAmount"
  FROM "Collection" c
  JOIN "Project" pr ON pr.id = c."projectId"
  LEFT JOIN "Journal" j ON j.source = 'COLLECTION' AND j."sourceId" = c.id
  WHERE c.status = 'POSTED' AND j.id IS NULL
) src
JOIN "LegalEntity" le ON le.id = src.legal_entity_id
GROUP BY src.dokumen, le.code
ORDER BY src.dokumen, le.code;


-- ############################################################################
-- B. T7 — Jurnal ganda per dokumen sumber
-- (index (source, sourceId) TIDAK unik; keputusan D3 menunda unique index)
-- ############################################################################

-- B-1 T7 | Kelompok (source, sourceId) dengan lebih dari satu jurnal.
--        `journal_ids` adalah daftar id yang diminta plan §4 PR-F1 langkah 4 —
--        kumpulkan SEBELUM ada usulan migrasi unik apa pun.
SELECT j.source,
       j."sourceId",
       COUNT(*) AS jumlah_jurnal,
       array_agg(j.id ORDER BY j."createdAt") AS journal_ids,
       array_agg(j."journalNumber" ORDER BY j."createdAt") AS journal_numbers,
       array_agg(j.status ORDER BY j."createdAt") AS journal_status,
       MIN(j."createdAt") AS dibuat_terawal,
       MAX(j."createdAt") AS dibuat_terakhir
FROM "Journal" j
WHERE j."sourceId" IS NOT NULL
GROUP BY j.source, j."sourceId"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, j.source;

-- B-2 T7 | Ringkasan jumlah kelompok duplikat per source
SELECT j.source, COUNT(*) AS kelompok_duplikat, SUM(j.n) AS total_jurnal_terlibat
FROM (
  SELECT source, "sourceId", COUNT(*) AS n
  FROM "Journal"
  WHERE "sourceId" IS NOT NULL
  GROUP BY source, "sourceId"
  HAVING COUNT(*) > 1
) j
GROUP BY j.source
ORDER BY kelompok_duplikat DESC;


-- ############################################################################
-- C. T1/T7 (+) — Jurnal yatim (dokumen sumber hilang)
-- Plan hanya menyebut source 'INVOICE'; diperluas ke keempat source karena
-- dampaknya sama (jurnal menunjuk dokumen yang tidak ada).
-- ############################################################################

-- C-1 Jurnal yatim per source
SELECT j.id AS journal_id, j."journalNumber", j.source, j."sourceId",
       j.description, j.status, j.date, j."legalEntityId"
FROM "Journal" j
WHERE j."sourceId" IS NOT NULL
  AND (
    (j.source = 'INVOICE'        AND NOT EXISTS (SELECT 1 FROM "VendorInvoice"  d WHERE d.id = j."sourceId"))
    OR (j.source = 'PAYMENT'        AND NOT EXISTS (SELECT 1 FROM "Payment"        d WHERE d.id = j."sourceId"))
    OR (j.source = 'CLIENT_INVOICE' AND NOT EXISTS (SELECT 1 FROM "ClientInvoice"  d WHERE d.id = j."sourceId"))
    OR (j.source = 'COLLECTION'     AND NOT EXISTS (SELECT 1 FROM "Collection"     d WHERE d.id = j."sourceId"))
  )
ORDER BY j.source, j.date;

-- C-2 Ringkasan jurnal yatim per source
SELECT j.source, COUNT(*) AS jumlah_yatim
FROM "Journal" j
WHERE j."sourceId" IS NOT NULL
  AND (
    (j.source = 'INVOICE'        AND NOT EXISTS (SELECT 1 FROM "VendorInvoice"  d WHERE d.id = j."sourceId"))
    OR (j.source = 'PAYMENT'        AND NOT EXISTS (SELECT 1 FROM "Payment"        d WHERE d.id = j."sourceId"))
    OR (j.source = 'CLIENT_INVOICE' AND NOT EXISTS (SELECT 1 FROM "ClientInvoice"  d WHERE d.id = j."sourceId"))
    OR (j.source = 'COLLECTION'     AND NOT EXISTS (SELECT 1 FROM "Collection"     d WHERE d.id = j."sourceId"))
  )
GROUP BY j.source
ORDER BY jumlah_yatim DESC;


-- ############################################################################
-- D. T1 (+) — Jurnal tidak balance (double-entry rusak)
-- ############################################################################

-- D-1 Jurnal dengan total debit <> total kredit
SELECT j.id AS journal_id, j."journalNumber", j.source, j."sourceId", j.status,
       j.date, SUM(l.debit) AS total_debit, SUM(l.credit) AS total_kredit,
       SUM(l.debit) - SUM(l.credit) AS selisih
FROM "Journal" j
JOIN "JournalLine" l ON l."journalId" = j.id
GROUP BY j.id, j."journalNumber", j.source, j."sourceId", j.status, j.date
HAVING ABS(SUM(l.debit) - SUM(l.credit)) > 0.001
ORDER BY ABS(SUM(l.debit) - SUM(l.credit)) DESC;

-- D-2 Jurnal yang sama sekali tanpa baris
SELECT j.id AS journal_id, j."journalNumber", j.source, j."sourceId", j.status, j.date
FROM "Journal" j
LEFT JOIN "JournalLine" l ON l."journalId" = j.id
WHERE l.id IS NULL
ORDER BY j.date;


-- ############################################################################
-- E. T2 — Overpayment AP / overcollection AR
--
-- Ambang status mengikuti kebijakan yang ditetapkan pada D1 (PR-F4), yaitu
-- konstanta yang benar-benar dipakai kode:
--   AP mengikat pada APPROVED  -> COMMITTED_AP_STATUSES = APPROVED, PAID
--   AR mengikat pada POSTED    -> COMMITTED_AR_STATUSES = POSTED
-- Lihat apps/api/src/modules/finance/application/services/{payment,collection}.service.ts
--
-- Catatan: draf plan §5 (D-9) memakai `c.status <> 'CANCELLED'` untuk AR. Itu
-- MENGHITUNG DRAFT dan karena itu melaporkan pelanggaran yang menurut kebijakan F4
-- bukan pelanggaran. E-2 di bawah memakai ambang kebijakan; E-2b menyediakan
-- pandangan luas (termasuk DRAFT) sebagai diagnosa terpisah.
-- ############################################################################

-- E-1 T2 | Overpayment AP (di luar ambang toleransi 0,01)
SELECT pi."invoiceId", vi."invoiceNumber", vi."totalAmount" AS nilai_invoice,
       SUM(pi.amount) AS total_dibayar, SUM(pi.amount) - vi."totalAmount" AS kelebihan,
       array_agg(DISTINCT p."paymentNumber") AS nomor_payment
FROM "PaymentItem" pi
JOIN "Payment" p ON p.id = pi."paymentId"
JOIN "VendorInvoice" vi ON vi.id = pi."invoiceId"
WHERE p.status IN ('APPROVED', 'PAID')
GROUP BY pi."invoiceId", vi."invoiceNumber", vi."totalAmount"
HAVING SUM(pi.amount) > vi."totalAmount" + 0.01
ORDER BY kelebihan DESC;

-- E-2 T2 | Overcollection AR — SELARAS KEBIJAKAN F4 (collection POSTED saja).
--        Kolom `nomor_collection` menampilkan SEMUA collection untuk invoice itu
--        (termasuk DRAFT) supaya konteksnya terlihat tanpa mengubah ambang hitung.
SELECT ci."clientInvoiceId", i."invoiceNumber", i."totalAmount" AS nilai_invoice,
       SUM(ci.amount) FILTER (WHERE c.status = 'POSTED') AS total_diterima,
       SUM(ci.amount) FILTER (WHERE c.status = 'POSTED') - i."totalAmount" AS kelebihan,
       array_agg(DISTINCT c."collectionNumber") AS nomor_collection,
       array_agg(DISTINCT c.status) AS status_collection
FROM "CollectionItem" ci
JOIN "Collection" c ON c.id = ci."collectionId"
JOIN "ClientInvoice" i ON i.id = ci."clientInvoiceId"
GROUP BY ci."clientInvoiceId", i."invoiceNumber", i."totalAmount"
HAVING SUM(ci.amount) FILTER (WHERE c.status = 'POSTED') > i."totalAmount" + 0.01
ORDER BY kelebihan DESC;

-- E-2b T2 | Overcollection AR — pandangan LUAS (semua collection kecuali CANCELLED,
--         termasuk DRAFT). Ini BUKAN pelanggaran menurut kebijakan F4; dipakai untuk
--         menemukan draft yang akan melampaui nilai invoice bila ikut di-posting.
SELECT ci."clientInvoiceId", i."invoiceNumber", i."totalAmount" AS nilai_invoice,
       SUM(ci.amount) AS total_tercatat, SUM(ci.amount) - i."totalAmount" AS kelebihan,
       array_agg(DISTINCT c."collectionNumber") AS nomor_collection,
       array_agg(DISTINCT c.status) AS status_collection
FROM "CollectionItem" ci
JOIN "Collection" c ON c.id = ci."collectionId"
JOIN "ClientInvoice" i ON i.id = ci."clientInvoiceId"
WHERE c.status <> 'CANCELLED'
GROUP BY ci."clientInvoiceId", i."invoiceNumber", i."totalAmount"
HAVING SUM(ci.amount) > i."totalAmount" + 0.01
ORDER BY kelebihan DESC;

-- E-3 T2 | Jejak baris berulang dalam satu dokumen (payment)
--        Sesudah PR-F3, pembuatan lewat API mengagregasi per invoice sehingga
--        hasil kosong = tidak ada sisa dari data lama / jalur non-API.
SELECT "paymentId", "invoiceId", COUNT(*) AS jumlah_baris, SUM(amount) AS total
FROM "PaymentItem"
GROUP BY "paymentId", "invoiceId"
HAVING COUNT(*) > 1
ORDER BY jumlah_baris DESC;

-- E-4 T2 | Jejak baris berulang dalam satu dokumen (collection)
SELECT "collectionId", "clientInvoiceId", COUNT(*) AS jumlah_baris, SUM(amount) AS total
FROM "CollectionItem"
GROUP BY "collectionId", "clientInvoiceId"
HAVING COUNT(*) > 1
ORDER BY jumlah_baris DESC;


-- ############################################################################
-- F. T3 — Saldo stok negatif per bucket
-- ############################################################################

-- F-1 T3 | Bucket stok bersaldo negatif
SELECT e."projectId", p.code AS project_code, e."warehouseId", w.code AS warehouse_code,
       e."wbsItemId", COALESCE(wbs.code, '(tanpa WBS)') AS wbs_code,
       SUM(e.quantity) AS saldo, COUNT(*) AS jumlah_baris,
       MIN(e."createdAt") AS pertama, MAX(e."createdAt") AS terakhir
FROM "StockLedgerEntry" e
JOIN "Project" p ON p.id = e."projectId"
JOIN "Warehouse" w ON w.id = e."warehouseId"
LEFT JOIN "WbsItem" wbs ON wbs.id = e."wbsItemId"
GROUP BY e."projectId", p.code, e."warehouseId", w.code, e."wbsItemId", wbs.code
HAVING SUM(e.quantity) < 0
ORDER BY saldo;

-- F-2 T3 | Ringkasan bucket negatif per project
SELECT e."projectId", p.code AS project_code, COUNT(*) AS jumlah_bucket_negatif,
       SUM(e.quantity) AS saldo_negatif_total
FROM "StockLedgerEntry" e
JOIN "Project" p ON p.id = e."projectId"
GROUP BY e."projectId", p.code, e."warehouseId", e."wbsItemId"
HAVING SUM(e.quantity) < 0
ORDER BY saldo_negatif_total;

-- F-3 T3 (+) | Baris ledger yang menyimpan qty OUT bertanda positif.
--        Sisa dari bug tanda sebelum migrasi 20260925; harus 0 setelahnya.
SELECT e.id, e."documentType", e."movementType", e.quantity, e."balanceAfter",
       e.reference, e."createdAt"
FROM "StockLedgerEntry" e
WHERE e."movementType" IN ('OUT', 'TRANSFER_OUT')
  AND e.quantity > 0
ORDER BY e."createdAt";


-- ############################################################################
-- G. T6/D6 — Akun GL wajib tidak lengkap (akan gagal keras GL_ACCOUNT_MISSING)
--
-- Wajib menurut apps/api/src/modules/finance/application/services/shared/gl.helper.ts:
--   110 Kas/Bank      (payment, collection)
--   120 Piutang Usaha (client invoice, collection)
--   210 Utang Usaha   (vendor invoice, payment)
--   410 Pendapatan    (client invoice)
--   610 Beban         (vendor invoice)
-- Akun 151 (PPN masukan) dan 220 (PPN keluaran) OPSIONAL.
-- ############################################################################

-- G-1 T6/D6 | Legal entity yang kehilangan minimal satu akun wajib (aktif)
SELECT le.id, le.code, le."legalName",
       EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '110%') AS punya_kas,
       EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '120%') AS punya_ar,
       EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '210%') AS punya_ap,
       EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '410%') AS punya_pendapatan,
       EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '610%') AS punya_beban
FROM "LegalEntity" le
WHERE NOT (
        EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '110%')
    AND EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '120%')
    AND EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '210%')
    AND EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '410%')
    AND EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '610%')
)
ORDER BY le.code;

-- G-2 T6/D6 | Akun wajib yang ADA tetapi NONAKTIF (dulu dipakai diam-diam,
--        kini diperlakukan sama seperti tidak ada -> posting gagal keras)
SELECT le.code AS legal_entity, c.code AS kode_akun, c.name, c."isActive"
FROM "ChartOfAccount" c
JOIN "LegalEntity" le ON le.id = c."legalEntityId"
WHERE c."isActive" = false
  AND (c.code LIKE '110%' OR c.code LIKE '120%' OR c.code LIKE '210%'
       OR c.code LIKE '410%' OR c.code LIKE '610%')
ORDER BY le.code, c.code;

-- G-3 (inventaris) COA per legal entity: prefix wajib dan jumlah akunnya
SELECT le.code AS legal_entity,
       LEFT(c.code, 3) AS prefix,
       COUNT(*) AS jumlah_akun,
       COUNT(*) FILTER (WHERE c."isActive") AS aktif
FROM "ChartOfAccount" c
JOIN "LegalEntity" le ON le.id = c."legalEntityId"
WHERE LEFT(c.code, 3) IN ('110', '120', '151', '210', '220', '410', '610')
GROUP BY le.code, LEFT(c.code, 3)
ORDER BY le.code, prefix;


-- ############################################################################
-- H. T6 — Batas periode: journalCount PeriodClose vs jurnal aktual
--
-- periodRange()/periodOf() memakai zona Asia/Jakarta (UTC+7 tanpa DST) dengan
-- batas akhir eksklusif. Padanan SQL-nya: geser +7 jam lalu ambil bulan, yaitu
-- tepat `to_char(j.date + interval '7 hours', 'YYYY-MM')`.
--
-- journalCount hanya bermakna pada periode yang sudah dihitung (CLOSED/LOCKED);
-- periode OPEN masih bernilai default 0, jadi dikecualikan agar tidak jadi noise.
-- ############################################################################

-- H-1 T6 | Periode CLOSED/LOCKED yang journalCount-nya tidak cocok dengan
--        jumlah jurnal POSTED pada rentang periode itu (jejak bug tanpa batas tanggal)
SELECT pc."legalEntityId", le.code AS legal_entity, pc.period, pc.status,
       pc."journalCount" AS tersimpan, COUNT(j.id) AS aktual,
       COUNT(j.id) - pc."journalCount" AS selisih, pc."closedAt"
FROM "PeriodClose" pc
JOIN "LegalEntity" le ON le.id = pc."legalEntityId"
LEFT JOIN "Journal" j
  ON j."legalEntityId" = pc."legalEntityId"
 AND j.status = 'POSTED'
 AND to_char(j.date + interval '7 hours', 'YYYY-MM') = pc.period
WHERE pc.status IN ('CLOSED', 'LOCKED')
GROUP BY pc."legalEntityId", le.code, pc.period, pc.status, pc."journalCount", pc."closedAt"
HAVING COUNT(j.id) <> pc."journalCount"
ORDER BY ABS(COUNT(j.id) - pc."journalCount") DESC;

-- H-2 (inventaris) Jurnal POSTED per legal entity per bulan (Jakarta)
SELECT le.code AS legal_entity, to_char(j.date + interval '7 hours', 'YYYY-MM') AS bulan,
       COUNT(*) AS jumlah_jurnal
FROM "Journal" j
JOIN "LegalEntity" le ON le.id = j."legalEntityId"
WHERE j.status = 'POSTED'
GROUP BY le.code, to_char(j.date + interval '7 hours', 'YYYY-MM')
ORDER BY le.code, bulan;

-- H-3 (inventaris) Status PeriodClose per legal entity
SELECT le.code AS legal_entity, pc.period, pc.status, pc."journalCount",
       pc."closedAt"
FROM "PeriodClose" pc
JOIN "LegalEntity" le ON le.id = pc."legalEntityId"
ORDER BY le.code, pc.period;

-- H-4 T6 (+) | Jurnal POSTED yang jatuh pada periode CLOSED/LOCKED (seharusnya
--        tidak mungkin setelah PR-F5; keberadaannya berarti tulisan lama/backdate)
SELECT j.id AS journal_id, j."journalNumber", j.source, le.code AS legal_entity,
       j.date, to_char(j.date + interval '7 hours', 'YYYY-MM') AS periode,
       pc.status AS status_periode
FROM "Journal" j
JOIN "LegalEntity" le ON le.id = j."legalEntityId"
JOIN "PeriodClose" pc
  ON pc."legalEntityId" = j."legalEntityId"
 AND pc.period = to_char(j.date + interval '7 hours', 'YYYY-MM')
WHERE j.status = 'POSTED'
  AND pc.status IN ('CLOSED', 'LOCKED')
ORDER BY j.date;


-- ############################################################################
-- I. T4/T10 — Recovery DP melebihi uang muka (jejak sebelum PR-F6)
-- ############################################################################

-- I-1 T4 | Total recovery claim CERTIFIED melebihi advanceAmount project
SELECT pr.id AS project_id, pr.code AS project_code, pr."advanceAmount",
       pr."advanceRecoveryRate", COALESCE(SUM(pc."recoveryAmount"), 0) AS total_recovery,
       COALESCE(SUM(pc."recoveryAmount"), 0) - pr."advanceAmount" AS kelebihan,
       COUNT(pc.id) AS jumlah_claim_certified
FROM "Project" pr
LEFT JOIN "ProgressClaim" pc
  ON pc."projectId" = pr.id AND pc.status = 'CERTIFIED'
GROUP BY pr.id, pr.code, pr."advanceAmount", pr."advanceRecoveryRate"
HAVING COALESCE(SUM(pc."recoveryAmount"), 0) > pr."advanceAmount" + 0.01
ORDER BY kelebihan DESC;

-- I-2 T10 | Claim CERTIFIED dengan certifiedAmount > amount (ditolak sejak PR-F6)
SELECT pc.id, pc."claimNumber", pc."projectId", pc.amount, pc."certifiedAmount",
       pc."certifiedAmount" - pc.amount AS kelebihan, pc."certifiedAt"
FROM "ProgressClaim" pc
WHERE pc.status = 'CERTIFIED'
  AND pc."certifiedAmount" IS NOT NULL
  AND pc."certifiedAmount" > pc.amount + 0.01
ORDER BY kelebihan DESC;

-- I-3 T4 (+) | cumulativeRecovered tersimpan melebihi advanceAmount project
SELECT pc.id, pc."claimNumber", pc."projectId", pc."cumulativeRecovered",
       pc."recoveryAmount", pr."advanceAmount", pc."certifiedAt"
FROM "ProgressClaim" pc
JOIN "Project" pr ON pr.id = pc."projectId"
WHERE pc."cumulativeRecovered" IS NOT NULL
  AND pr."advanceAmount" IS NOT NULL
  AND pc."cumulativeRecovered" > pr."advanceAmount" + 0.01
ORDER BY pc."cumulativeRecovered" DESC;

-- I-4 (inventaris) Rekonsiliasi recovery DP per project (dasar I-1)
SELECT pr.code AS project_code, pr."advanceAmount",
       COUNT(pc.id) FILTER (WHERE pc.status = 'CERTIFIED') AS claim_certified,
       COALESCE(SUM(pc."recoveryAmount") FILTER (WHERE pc.status = 'CERTIFIED'), 0) AS recovery_tercatat,
       GREATEST(pr."advanceAmount" - COALESCE(SUM(pc."recoveryAmount") FILTER (WHERE pc.status = 'CERTIFIED'), 0), 0) AS sisa_dp
FROM "Project" pr
LEFT JOIN "ProgressClaim" pc ON pc."projectId" = pr.id
WHERE pr."advanceAmount" IS NOT NULL AND pr."advanceAmount" > 0
GROUP BY pr.id, pr.code, pr."advanceAmount"
ORDER BY pr.code;


-- ############################################################################
-- J. T8 — Approval (jejak sebelum PR-F7)
--
-- Sejak PR-F7, keunikan per transaksi dijaga "ApprovalInstance", dan satu task
-- dibuat per step. Data lama yang di-backfill tampil sebagai instance 1-step.
-- ############################################################################

-- J-1 T8 | Transaksi dengan lebih dari satu task tetapi semuanya stepOrder = 1
--        (sisa pola lama: task per transaksi, bukan per step)
SELECT t."transactionType", t."transactionId", COUNT(*) AS jumlah_task,
       COUNT(DISTINCT t."stepOrder") AS step_unik,
       array_agg(t.id ORDER BY t."createdAt") AS task_ids
FROM "ApprovalTask" t
GROUP BY t."transactionType", t."transactionId"
HAVING COUNT(*) > 1 AND COUNT(DISTINCT t."stepOrder") = 1
ORDER BY jumlah_task DESC;

-- J-2 T8 | Task tanpa instance (harus 0 setelah backfill PR-F7)
SELECT t.id, t."transactionType", t."transactionId", t."stepOrder", t.status, t."createdAt"
FROM "ApprovalTask" t
LEFT JOIN "ApprovalInstance" i ON i.id = t."instanceId"
WHERE i.id IS NULL
ORDER BY t."createdAt";

-- J-3 (inventaris) Sebaran instance approval per status dan jumlah step
SELECT i.status, COUNT(*) AS jumlah_instance,
       MIN(jsonb_array_length(COALESCE(i."stepPlan", '[]'::jsonb))) AS min_step,
       MAX(jsonb_array_length(COALESCE(i."stepPlan", '[]'::jsonb))) AS max_step,
       COUNT(*) FILTER (WHERE i."completedAt" IS NULL) AS belum_selesai
FROM "ApprovalInstance" i
GROUP BY i.status
ORDER BY i.status;


-- ############################################################################
-- K. (inventaris) Ringkasan untuk tabel bukti PR-F1
--    Menghitung jumlah pelanggaran tiap temuan dalam satu hasil.
-- ############################################################################
SELECT 'T1 Payment PAID tanpa jurnal' AS temuan, COUNT(*) AS jumlah
FROM "Payment" p
LEFT JOIN "Journal" j ON j.source = 'PAYMENT' AND j."sourceId" = p.id
WHERE p.status = 'PAID' AND j.id IS NULL
UNION ALL
SELECT 'T1 VendorInvoice POSTED tanpa jurnal', COUNT(*)
FROM "VendorInvoice" vi
LEFT JOIN "Journal" j ON j.source = 'INVOICE' AND j."sourceId" = vi.id
WHERE vi.status = 'POSTED' AND j.id IS NULL
UNION ALL
SELECT 'T1 ClientInvoice POSTED tanpa jurnal', COUNT(*)
FROM "ClientInvoice" ci
LEFT JOIN "Journal" j ON j.source = 'CLIENT_INVOICE' AND j."sourceId" = ci.id
WHERE ci.status = 'POSTED' AND j.id IS NULL
UNION ALL
SELECT 'T1 Collection POSTED tanpa jurnal', COUNT(*)
FROM "Collection" c
LEFT JOIN "Journal" j ON j.source = 'COLLECTION' AND j."sourceId" = c.id
WHERE c.status = 'POSTED' AND j.id IS NULL
UNION ALL
SELECT 'T7 Kelompok jurnal ganda', COUNT(*)
FROM (SELECT 1 FROM "Journal" WHERE "sourceId" IS NOT NULL GROUP BY source, "sourceId" HAVING COUNT(*) > 1) d
UNION ALL
SELECT 'T2 Overpayment AP', COUNT(*)
FROM (
  SELECT pi."invoiceId"
  FROM "PaymentItem" pi
  JOIN "Payment" p ON p.id = pi."paymentId"
  JOIN "VendorInvoice" vi ON vi.id = pi."invoiceId"
  WHERE p.status IN ('APPROVED','PAID')
  GROUP BY pi."invoiceId", vi."totalAmount"
  HAVING SUM(pi.amount) > vi."totalAmount" + 0.01
) d
UNION ALL
SELECT 'T2 Overcollection AR', COUNT(*)
FROM (
  SELECT ci."clientInvoiceId"
  FROM "CollectionItem" ci
  JOIN "Collection" c ON c.id = ci."collectionId"
  JOIN "ClientInvoice" i ON i.id = ci."clientInvoiceId"
  WHERE c.status = 'POSTED'
  GROUP BY ci."clientInvoiceId", i."totalAmount"
  HAVING SUM(ci.amount) > i."totalAmount" + 0.01
) d
UNION ALL
SELECT 'T4 Recovery DP melebihi advance', COUNT(*)
FROM (
  SELECT 1 FROM "Project" pr
  LEFT JOIN "ProgressClaim" pc ON pc."projectId" = pr.id AND pc.status = 'CERTIFIED'
  GROUP BY pr.id, pr."advanceAmount"
  HAVING COALESCE(SUM(pc."recoveryAmount"), 0) > pr."advanceAmount" + 0.01
) d
UNION ALL
SELECT 'T3 Bucket stok negatif', COUNT(*)
FROM (SELECT 1 FROM "StockLedgerEntry" GROUP BY "projectId", "warehouseId", "wbsItemId" HAVING SUM(quantity) < 0) d
UNION ALL
SELECT 'T6/D6 Legal entity akun wajib kurang', COUNT(*)
FROM "LegalEntity" le
WHERE NOT (
        EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '110%')
    AND EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '120%')
    AND EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '210%')
    AND EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '410%')
    AND EXISTS (SELECT 1 FROM "ChartOfAccount" c WHERE c."legalEntityId" = le.id AND c."isActive" AND c.code LIKE '610%')
)
ORDER BY temuan;
