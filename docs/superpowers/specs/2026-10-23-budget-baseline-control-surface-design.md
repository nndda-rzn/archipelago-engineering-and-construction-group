# Budget Baseline — Control Surface — Design

Tanggal: 2026-10-23
Status: disetujui untuk implementasi
Menggantikan arah visual: `2026-10-22-budget-workspace-design.md` §5.4

## 1. Tujuan

Halaman `/budget` berjudul **Budget Baseline**, tetapi secara data tidak memiliki
baseline: `BudgetItem.version` hanya dinaikkan di tempat, tidak ada salinan yang
dibekukan, dan setelah publish halaman menjadi jalan buntu permanen.

Dokumen ini menetapkan halaman itu sebagai **control surface biaya**: satu
pernyataan biaya per WBS yang mempertemukan janji, niat, komitmen, kenyataan, dan
proyeksi — serta membuat baseline benar-benar ada di database.

Definisi sukses — tiga pertanyaan terjawab tanpa membuka halaman lain:

1. **Apa yang dulu dijanjikan?** → baseline beku, berversi, bertanggal.
2. **Apa yang sekarang diniatkan?** → revisi berjalan.
3. **Berapa biaya nyatanya dan akan berakhir di mana?** → aktual + EAC.

## 2. Kondisi awal (terukur dari kode, bukan asumsi)

Semua fakta di bawah dapat direproduksi dengan perintah pada kolom ketiga.

| # | Fakta | Bukti | Verifikasi |
| --- | --- | --- | --- |
| 1 | Tidak ada tabel baseline. `publish` menaikkan `version` pada baris yang sama | `budget.service.ts:183-186`, `schema.prisma:689` | `grep -n "version" apps/api/src/modules/project/application/services/budget.service.ts` |
| 2 | Publish = jalan buntu. Semua baris `PUBLISHED`; `upsert` menolak 409 dan form disembunyikan | `budget.service.ts:150-152`, `budget-inspector.tsx:98-101` | baca dua baris tersebut |
| 3 | `pvMismatch` salah konsep: aturan `\|PV/BAC − 1\| > 1%` menandai PV ≠ BAC sebagai error, padahal PV ≠ BAC normal di baseline time-phased | `budget-tree.ts:204-205` | aritmetika |
| 4 | Akibat #3, peringatan menyala di **setiap** proyek: seed men-set `pv = bac × 0,60` | `seed-demo.ts:531-536` | 0,60 → selisih 40% |
| 5 | `overAllocated` juga menyala permanen: seluruh biaya dipetakan ke WBS '2' yang budget-nya 40%, sedangkan AC ≈ 45–56% BAC | `seed-demo.ts:504-507`, `20261022_backfill_wbs_dimension` | 0,56 > 0,40 |
| 6 | **Double counting biaya material.** `used = ledger OUT + jurnal 610*`, tetapi material issue hanya menulis ledger OUT tanpa jurnal; jurnal 6100 berasal dari invoice vendor atas material yang sama | `budget.service.ts:45-55`, `material-issue.service.ts:105-118`, `gl.helper.ts:83` | baca tiga lokasi |
| 7 | Dua implementasi actual cost yang berbeda untuk satu proyek | `budget.service.ts:45-55` vs `actual-cost.calculator.ts:16-40` | bandingkan klausa `where` |
| 8 | Tiga format uang pada satu layar | `budget.page.tsx:63` (`formatIdr`), `budget-tree.tsx:17-29` (tanpa Rp), `budget-inspector.tsx:17-19` (tanpa Rp) | grep ketiga fungsi |
| 9 | Kontras bilah gagal WCAG 1.4.11: `neutral-300` di atas `neutral-100` = **1,34:1**; `neutral-400` = **2,33:1**; `neutral-500` = **4,40:1** (batas 3:1) | `cost-type-bar.tsx:29-37` | hitung luminans relatif |
| 10 | Tidak ada baris Total yang sejajar kolom, sehingga pohon tidak dapat diikat ke ringkasan | `budget-tree.tsx:133-143` | baca render |
| 11 | Overflow horizontal di mobile: grid 4 kolom tetap tanpa `overflow-x-auto` | `budget-tree.tsx:91` | viewport 375px |
| 12 | `BudgetTotalBar` dead code (diekspor, nol pemakaian) | `budget-status.tsx:29-38` | `grep -rn "BudgetTotalBar" apps/web/src` |
| 13 | `Subcontract` tidak punya `wbsItemId`, sedangkan `PurchaseOrderItem` punya | `schema.prisma:1551-1573` vs `:875` | baca kedua model |
| 14 | `Forecast` hanya level proyek, tanpa dimensi WBS | `schema.prisma:757-774` | baca model |
| 15 | **15 berkas non-spec** membaca `budgetItem.*`, dan **13** di antaranya memfilter `status: 'PUBLISHED'`. (Dua berkas lain yang cocok `status: 'PUBLISHED'` — `drawing.service.ts`, `metric-registry.ts` — adalah status model lain, bukan budget) | `control-tower`, `project-analytics`, `approval-detail`, `budget`, `commitment`, `earned-value`, `forecast`, `portfolio`, `project-command-center`, `project-health`, `project`, `budget-check`, `portfolio-evm.calculator` | lihat perintah di §2.1 |

Catatan: database lokal tidak berjalan saat spec ini ditulis (`P1001` pada
`localhost:5432`), sehingga tidak ada klaim jumlah baris nyata. Seluruh fakta di
atas berasal dari kode dan aritmetika.

### 2.1 Perintah verifikasi

Dijalankan dari akar repo. Semua angka pada tabel di atas dapat direproduksi
dengan perintah berikut.

```powershell
# Fakta #15 — pembaca budgetItem dan filter PUBLISHED
$files = Get-ChildItem apps/api/src -Recurse -Include *.ts |
  Where-Object { $_.Name -notmatch '\.spec\.' }
foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw
  if ($c -match 'budgetItem\.') { $f.FullName }
}                                                    # → 15 berkas

foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw
  if ($c -match 'budgetItem\.' -and $c -match "status: 'PUBLISHED'") { $f.FullName }
}                                                    # → 13 berkas

# Fakta #6 — sumber jurnal yang ada (tidak ada jurnal untuk material issue)
Select-String -Path apps/api/src/modules/finance/application/services/shared/gl.helper.ts -Pattern "source: '"

# Fakta #12 — dead code
Select-String -Path apps/web/src -Include *.tsx -Pattern "BudgetTotalBar" -Recurse
```

Perhitungan kontras (fakta #9) memakai luminans relatif WCAG:

| Warna | Di atas track `#f4f4f5` | Di atas putih |
| --- | --- | --- |
| `neutral-800` `#27272a` | 13,55:1 | 14,89:1 |
| `neutral-700` `#3f3f46` | 9,50:1 | 10,44:1 |
| `neutral-600` `#52525b` | 7,03:1 | 7,73:1 |
| `neutral-500` `#71717a` | 4,40:1 | 4,83:1 |
| `neutral-400` `#a1a1aa` | **2,33:1** | **2,56:1** |
| `neutral-300` `#d4d4d8` | **1,34:1** | **1,48:1** |

## 3. Ruang lingkup

Termasuk:

- Tabel baseline berversi + alur freeze/revisi (DB).
- Dimensi WBS pada `Subcontract` (DB).
- Halaman Budget memakai satu sumber `actual` (ledger OUT), bukan dua yang
  dijumlahkan; selisih terhadap dashboard dilaporkan terbuka.
- Rekonsiliasi double-count ditampilkan, tidak disembunyikan.
- Perbaikan `pvMismatch` → `pvCoverage`.
- Rebuild UI sebagai pernyataan biaya (cost statement).

Tidak termasuk (spec lanjutan, dicatat eksplisit):

- **Perbaikan double-count biaya material.** Menyentuh AC, dan AC adalah penyebut
  CPI/SPI di seluruh dashboard, portfolio, dan control tower. Angka keuangan tidak
  boleh bergeser sebagai efek samping pekerjaan visual. Lihat §9.
- EAC per WBS (tidak dimodelkan; menurunkannya berarti mengarang pembagian).
- Alur approval sebelum freeze.
- Perbaikan nilai `ControlAccount.plannedValue` (tetap ditampilkan apa adanya).

## 4. Keputusan desain

### 4.1 Baseline adalah tabel, bukan kolom

`BudgetItem.version` tidak dapat menjadi baseline karena ia berubah di tempat.
Baseline memerlukan salinan yang tidak dapat diubah. Maka:

- **Freeze** = salin `BudgetItem` saat ini menjadi `BudgetBaseline` berstatus
  `FROZEN` beserta seluruh `BudgetBaselineLine`. Tidak ada jalur update.
- **Revise** = salin baseline `FROZEN` terakhir menjadi `DRAFT` baru dengan versi
  naik, edit, lalu freeze.
- `BudgetItem` tetap menjadi tabel kerja hidup.

### 4.2 `BudgetItem.status` disemantikkan ulang, bukan dihapus

Karena 15 berkas non-spec membaca `budgetItem.*` dan 13 di antaranya memakai
`status = 'PUBLISHED'` (fakta #15), menghapus atau mengganti nama kolom akan
memutus seluruh laporan. Maka semantiknya didefinisikan ulang tanpa mengubah
nilai:

| Nilai | Arti baru |
| --- | --- |
| `PUBLISHED` | tidak ada revisi terbuka; angka ini adalah baseline berjalan |
| `DRAFT` | ada revisi terbuka |

Pembaca lama tetap benar tanpa disentuh: mereka memang menginginkan angka
baseline berjalan.

### 4.3 `Subcontract` diberi `wbsItemId`

Asimetri dengan `PurchaseOrderItem` adalah cacat, bukan pilihan. Tanpa dimensi
itu kolom komitmen tidak dapat lengkap. Baris `NULL` **tidak** dipaksa masuk ke
WBS mana pun; ditampilkan sebagai baris tersendiri
**"Committed, not yet allocated"**. Komitmen yang belum dipetakan adalah sinyal
nyata, bukan angka yang dibuang.

### 4.4 EAC hanya di baris total

`Forecast` tidak berdimensi WBS (fakta #14). Menurunkan EAC per WBS berarti
mengarang pembagian. Baris WBS memuat Baseline · Revised · Committed · Actual ·
Available · Variance. Baris total menambah EAC dan VAC.

### 4.5 Satu kalkulator actual cost, dan satu pergeseran angka yang harus disadari

Halaman Budget berhenti menghitung sendiri dan memakai `ActualCostCalculator`
yang sama dengan dashboard, sehingga tidak ada lagi dua angka untuk satu proyek
(fakta #7). Konsekuensi yang diterima: komponen `actual` per WBS kini **hanya**
dari ledger OUT, dan jurnal 610* tidak lagi ditambahkan — karena penambahan
itulah yang menyebabkan double count (fakta #6).

**Pergeseran ini nyata dan harus dinyatakan, bukan disembunyikan.** Pada data
seed, `used` level proyek akan **turun** sebesar komponen jurnal 610* (mis.
PRJ-014: −Rp 75 M dari invoice material). Artinya angka "Used" di halaman Budget
berubah dari sebelumnya. Ini disengaja: angka lama melebihkan biaya.

Yang **tidak** berubah: `ActualCostCalculator` itu sendiri. Ia tetap dipakai
apa adanya oleh dashboard, portfolio, control tower, dan CPI/SPI. Memperbaiki
double count di dalamnya akan menggeser seluruh rasio keuangan di aplikasi, dan
itu tidak boleh menjadi efek samping pekerjaan visual — karena itu menjadi spec
lanjutan (§9).

Konsekuensi yang harus diterima: selama spec lanjutan belum dikerjakan, `actual`
di halaman Budget (ledger OUT saja) akan **lebih kecil** daripada AC di dashboard
(ledger OUT + jurnal INVOICE). Selisihnya dilaporkan terbuka lewat
`reconciliation` (§4.6), bukan didiamkan.

### 4.6 Rekonsiliasi ditampilkan, bukan diperbaiki diam-diam

Double count material tetap ada di level proyek (spec lanjutan). Halaman
menghitung `ledgerOut` dan `journalExpense610` secara terpisah dan menampilkan
baris jujur bila keduanya > 0:

> "Material cost appears in both the stock ledger and expense journals — total may double count."

Ini dapat diuji, dan perbaikannya menjadi spec tersendiri dengan pengujian
dampak ke CPI/SPI seluruh proyek.

### 4.7 `pvMismatch` diganti `pvCoverage`

PV ≠ BAC adalah kondisi normal: PV baru menyamai BAC saat proyek selesai. Aturan
`|PV/BAC − 1| > 1%` karena itu salah secara konsep. Penggantinya:

```ts
pvCoverage: {
  pv: number,
  bac: number,
  status: 'NO_BASELINE' | 'PARTIAL' | 'COMPLETE',
}
```

- `NO_BASELINE` — `pv = 0`: belum ada schedule baseline. Sinyal nyata.
- `COMPLETE` — `pv > 0 && pv ≤ bac`.
- `PARTIAL` — `pv > bac`: PV melampaui BAC, ini memang tidak wajar dan tetap
  ditandai.

### 4.8 `overAllocated` dihitung terhadap revised, hanya pada leaf

Dipertahankan sebagai sinyal nyata, tetapi: (a) dibandingkan dengan **revised**,
bukan baseline — karena revisi adalah niat berjalan; (b) hanya pada leaf, agar
induk yang me-rollup anaknya tidak dilaporkan sebagai over-allocated.

## 5. Arsitektur

### 5.1 Skema database (`apps/api/prisma/schema.prisma`)

```prisma
model BudgetBaseline {
  id        String    @id @default(cuid())
  projectId String
  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  version   Int
  status    String    @default("DRAFT") // DRAFT | FROZEN
  label     String?
  reason    String?
  frozenAt  DateTime?
  frozenBy  String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  lines BudgetBaselineLine[]

  @@unique([projectId, version])
  @@index([projectId, status])
}

model BudgetBaselineLine {
  id         String         @id @default(cuid())
  baselineId String
  baseline   BudgetBaseline @relation(fields: [baselineId], references: [id], onDelete: Cascade)
  wbsItemId  String
  wbsItem    WbsItem        @relation(fields: [wbsItemId], references: [id], onDelete: Cascade)
  costType   String
  amount     Decimal        @db.Decimal(18, 2)

  @@unique([baselineId, wbsItemId, costType])
  @@index([baselineId])
  @@index([wbsItemId])
}
```

Perubahan aditif pada model yang sudah ada:

```prisma
model Subcontract {
  wbsItemId String?
  wbsItem   WbsItem? @relation(fields: [wbsItemId], references: [id])
  @@index([wbsItemId])
}

model WbsItem {
  baselineLines     BudgetBaselineLine[]
  subcontracts      Subcontract[]
}
```

### 5.2 Migrasi

Satu migrasi `20261023_budget_baseline`, tiga bagian:

1. **DDL** — dua tabel baru, dua kolom baru, indeks, foreign key.
2. **Backfill** — untuk setiap proyek yang punya `BudgetItem` berstatus
   `PUBLISHED`, buat `BudgetBaseline` versi 1 berstatus `FROZEN` berlabel
   `Migrated baseline`, lalu salin seluruh `BudgetItem` menjadi
   `BudgetBaselineLine`. Idempoten: `WHERE NOT EXISTS`.
3. **Tanpa** menyentuh `BudgetItem` — nilai dan status dibiarkan apa adanya.

### 5.3 Kontrak (`packages/api-contracts/src/project.ts`)

Aditif. Field lama dipertahankan.

```ts
export const budgetBaselineSchema = z.object({
  id: z.string(),
  version: z.number(),
  status: z.enum(['DRAFT', 'FROZEN']),
  label: z.string().nullable(),
  reason: z.string().nullable(),
  frozenAt: z.string().nullable(),
  total: z.number(),
});

export const budgetStatementRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  depth: z.number(),
  childrenCount: z.number(),
  baseline: z.number(),
  revised: z.number(),
  committed: z.number(),
  actual: z.number(),
  available: z.number(),        // revised - committed - actual
  variance: z.number(),         // revised - actual
  varianceBaseline: z.number(), // revised - baseline
  byCostType: z.record(costTypeKeySchema, z.number()),
});

export const budgetStatementSchema = z.object({
  projectId: z.string(),
  currency: z.string(),
  baseline: budgetBaselineSchema.nullable(),
  previous: budgetBaselineSchema.nullable(),
  rows: z.array(budgetStatementRowSchema),
  totals: z.object({
    baseline: z.number(),
    revised: z.number(),
    committed: z.number(),
    actual: z.number(),
    available: z.number(),
    variance: z.number(),
    varianceBaseline: z.number(),
    contractValue: z.number(),
    eac: z.number().nullable(),
    vac: z.number().nullable(),
  }),
  unallocated: z.object({
    committed: z.number(),
    actual: z.number(),
  }),
  reconciliation: z.object({
    ledgerOut: z.number(),
    journalExpense610: z.number(),
    doubleCountRisk: z.boolean(),
  }),
  warnings: z.object({
    overContract: z.boolean(),
    overCommitted: z.array(z.object({ wbsId: z.string(), code: z.string(), amount: z.number() })),
    noBudget: z.array(z.object({ wbsId: z.string(), code: z.string() })),
    pvCoverage: z.object({
      pv: z.number(),
      bac: z.number(),
      status: z.enum(['NO_BASELINE', 'PARTIAL', 'COMPLETE']),
    }),
  }),
  costCoverage: z.object({ allocatedNodes: z.number(), totalNodes: z.number() }),
});
```

Skema lama `budgetSummarySchema` **dipertahankan** agar konsumen lain tidak
rusak; `budgetSummarySchema.warnings.pvMismatch` ditandai deprecated dan
dihapus pada spec lanjutan.

### 5.4 Service (`apps/api/src/modules/project/application/services/`)

`budget-baseline.ts` — fungsi murni, tanpa Prisma, untuk pengujian tanpa DB:

- `buildStatement(rows, baselineLines, committedRows, actualRows, pvByWbs)` → `rows` ber-rollup- `reconcile(ledgerOut, journalExpense610)` → `reconciliation`
- `collectStatementWarnings(totals, rows, pv)` → `warnings`

Aturan rollup: `baseline`, `revised`, `committed`, `actual`, `byCostType` pada
sebuah simpul adalah jumlah subtree-nya. `available` dan `variance` dihitung
**setelah** rollup, bukan dijumlahkan, agar konsisten.

`budget-baseline.service.ts`:

| Metode | Perilaku |
| --- | --- |
| `findBaseline(projectId)` | baseline `FROZEN` terakhir + sebelumnya, beserta total |
| `freeze(projectId, dto, actorId)` | tolak bila tidak ada `BudgetItem` (409 `BUDGET_EMPTY`); tolak bila baseline `DRAFT` sudah ada (409 `REVISION_OPEN`); salin `BudgetItem` → baseline `FROZEN` versi berikutnya; set `BudgetItem.status = 'PUBLISHED'` |
| `openRevision(projectId, dto, actorId)` | tolak bila baseline `DRAFT` sudah ada (409 `REVISION_OPEN`); salin baseline `FROZEN` terakhir → `DRAFT` versi berikutnya; salin nilainya ke `BudgetItem`; set `BudgetItem.status = 'DRAFT'` |

Ketiga operasi menulis audit (`BUDGET.BASELINE_FREEZE`,
`BUDGET.REVISION_OPEN`) dan memanggil `invalidateAnalytics` — pola yang sama
dengan `BudgetService.publish`.

`BudgetService.findAll` diubah menjadi penyusun statement (§5.3). Komponen
`actual` diambil dari agregat ledger `movementType='OUT'` per `wbsItemId` — satu
sumber, bukan dua yang dijumlahkan (§4.5). Komponen jurnal 610* tetap dihitung,
tetapi **hanya** untuk `reconciliation`, tidak dimasukkan ke `actual`.

### 5.5 API (`budget.controller.ts`)

| Metode | Rute | Permission |
| --- | --- | --- |
| `GET` | `/projects/:id/budget` | `BudgetView` |
| `POST` | `/projects/:id/budget/items` | `BudgetCreate` |
| `POST` | `/projects/:id/budget/publish` | `BudgetApprove` (dipertahankan, kini setara freeze) |
| `GET` | `/projects/:id/budget/baseline` | `BudgetView` |
| `POST` | `/projects/:id/budget/baseline/freeze` | `BudgetApprove` |
| `POST` | `/projects/:id/budget/baseline/revision` | `BudgetApprove` |

`POST /publish` dipertahankan sebagai alias `freeze` agar klien dan e2e lama
tidak putus.

### 5.6 Seed (`apps/api/prisma/seed-demo.ts`)

- Buat baseline v1 `FROZEN` untuk setiap proyek ber-budget, konsisten dengan
  `BudgetItem` yang sudah di-seed.
- Isi `Subcontract.wbsItemId` agar kolom komitmen terwakili.
- Idempoten — hanya berlaku saat baris belum ada.
- **Tidak** mengubah nilai `BudgetItem`, `plannedValue`, atau `actual` — agar
  angka dashboard tidak bergeser.

## 6. UI — arah visual

### 6.1 Dasar pemilihan bentuk

Arah visual ditentukan dari sifat datanya, bukan selera:

| Pertimbangan | Kesimpulan |
| --- | --- |
| Hubungan data = perbandingan antar kategori (baris WBS) + part-of-whole | Bentuk yang tepat adalah tabel dengan bilah inline, bukan kartu |
| Metric-card grid sebagai layout default adalah anti-pattern dashboard | Kartu KPI sebagai struktur utama ditolak |
| Baseline/revised/actual/variance adalah bentuk **pernyataan biaya** | Setiap laporan biaya konstruksi berbentuk ini; memilihnya soal jenis dokumen, bukan gaya |
| Satu formatter + satu tabel menutup fakta #8, #10, #11 | Satu keputusan menutup empat temuan |

Maka: **cost statement**. Tanpa kartu, tanpa bayangan, tanpa radius. Garis rambut
sebagai satu-satunya struktur. Seluruh angka `font-mono tabular-nums` rata kanan.

### 6.2 Susunan

```
┌─ Budget Baseline ────────────────── v3 FROZEN · 22 Oct 2026 ─┐
│ PRJ-014 · EPC Industrial Processing     [Open revision] [Freeze] │
├───────────────────────────────────────────────────────────────┤
│ BASELINE     REVISED      COMMITTED     ACTUAL       VARIANCE  │
│ Rp 4,80 T    Rp 5,12 T    Rp 3,40 T     Rp 3,05 T     −Rp 32 M │
├──┬──────────────┬─────────┬─────────┬─────────┬─────────┬─────┤
│  │ WBS          │BASELINE │REVISED  │ACTUAL   │AVAILABLE│  Δ  │
├──┼──────────────┼─────────┼─────────┼─────────┼─────────┼─────┤
│▸ │2 Procurement │ 1.920 M │ 2.100 M │ 1.850 M │   −50 M │ −50 │
│  │  2.1 Long-lead│  945 M │ 1.100 M │   980 M │  +120 M │ +30 │
├──┴──────────────┴─────────┴─────────┴─────────┴─────────┴─────┤
│  Total          │ 4.800 M │ 5.120 M │ 3.050 M │ 2.070 M │ −80 │
│  EAC 5.200 M · VAC −80 M                                      │
└───────────────────────────────────────────────────────────────┘
```

Komponen:

| Komponen | Tanggung jawab |
| --- | --- |
| `budget-statement.tsx` | tabel semantik, header sticky, baris total, ekspansi baris |
| `statement-row.tsx` | satu baris: sel angka + bilah + tanda variance |
| `variance-bar.tsx` | bilah divergen bertanda, diskalakan ke selisih terbesar yang terlihat |
| `baseline-header.tsx` | versi, tanggal beku, label, tombol revise/freeze |
| `budget-reconciliation.tsx` | baris rekonsiliasi double-count (§4.6) |
| `budget-inspector.tsx` | dipakai ulang, dirender **inline di bawah baris** yang dipilih |
| `budget.page.tsx` | pemilihan proyek, header, statement, peringatan |

`cost-type-bar.tsx` dipertahankan untuk komposisi cost type, dengan ramp warna
baru (§7).

### 6.3 Perilaku

- **Klik baris** → inspector terbuka **di bawah baris itu** (inline), bukan rail
  kanan. Alasan: konteks perbandingan tetap terlihat saat mengedit, dan tetap
  masuk akal di layar sempit. Rail kanan pada 1366px menyisakan kolom WBS terlalu
  sempit untuk enam kolom angka.
- **Kolom WBS sticky** saat scroll horizontal.
- **Kolom Variance** dapat diurutkan; default urut kode WBS.
- **Freeze** memerlukan konfirmasi (`ConfirmActionButton` yang sudah ada) dan
  menyebutkan versi yang akan dibekukan.
- **Open revision** hanya muncul bila baseline `FROZEN` ada dan tidak ada
  `DRAFT` terbuka.
- **Empty state** tanpa baseline: "No baseline frozen yet. Freeze the current
  budget to start tracking variance." dengan tombol Freeze sebagai aksi utama.
- **Error state** memakai `ErrorState` yang sudah ada, bukan `Rp 0` palsu.

### 6.4 Format angka

Satu formatter di seluruh halaman: `formatIdrCompact` untuk sel tabel (dengan
nilai penuh `formatIdr` di `title`) dan `formatIdr` untuk baris total. Fungsi
`compact()` lokal di `budget-tree.tsx:17-25` dan `money()` di
`budget-inspector.tsx:17-19` dihapus.

## 7. Aksesibilitas

| Aturan | Implementasi |
| --- | --- |
| Struktur tabel | `<table>` dengan `<caption>`, `<thead>`, `<th scope="col">`, `<th scope="row">` untuk kolom WBS |
| Kontras bilah | Ramp diganti: `neutral-800` (13,55:1) / `neutral-700` (9,50:1) / `neutral-600` (7,03:1) / `neutral-500` (4,40:1) di atas track `neutral-100`. Ramp lama gagal 3:1 (fakta #9) |
| Warna bukan satu-satunya sinyal | Variance selalu disertai tanda `+`/`−` dan teks; bilah hanya redundan |
| Ekspansi baris | `<button>` dengan `aria-expanded` dan `aria-controls` |
| Baris terpilih | `aria-current="true"` |
| Bilah komposisi | `role="img"` + `aria-label` berisi komposisi dalam teks (pola yang sudah ada di `cost-type-bar.tsx`) |
| Teks | Tidak memakai `neutral-400` untuk teks (2,56:1 di atas putih). Minimum `neutral-600` (7,73:1) |
| Target sentuh | Minimal 24×24 CSS px (WCAG 2.5.8); tombol ekspansi 32×32 |
| Gerak | Transisi hanya warna/opacity, 150ms, menghormati `prefers-reduced-motion` (sudah global di `globals.css:170-177`) |

## 8. Pengujian

| Lapisan | Kasus |
| --- | --- |
| Unit `budget-baseline.ts` | rollup induk = jumlah anak untuk baseline/revised/committed/actual; `available` dihitung setelah rollup; `byCostType` menjumlah tepat |
| Unit `budget-baseline.ts` | `reconcile` → `doubleCountRisk` benar hanya bila kedua sisi > 0 |
| Unit `budget-baseline.ts` | `collectStatementWarnings`: `overContract`, `overCommitted` hanya pada leaf, `noBudget` hanya leaf, `pvCoverage` tiga status |
| Unit `pvCoverage` | `pv = 0` → `NO_BASELINE`; `pv = 0,6 × bac` → `COMPLETE` (bukan peringatan); `pv > bac` → `PARTIAL` |
| Service | `freeze` tanpa `BudgetItem` → 409 `BUDGET_EMPTY`; `freeze` saat `DRAFT` ada → 409 `REVISION_OPEN` |
| Service | `openRevision` menyalin baseline `FROZEN` terakhir dan menaikkan versi; baseline lama **tidak berubah** |
| Service | `freeze` setelah revisi menghasilkan v2; v1 tetap identik byte-per-byte |
| Service | `actual` per WBS = jumlah ledger OUT per WBS (bukan ledger + jurnal), diverifikasi terhadap agregat langsung di DB |
| Service | `reconciliation.ledgerOut` dan `reconciliation.journalExpense610` dilaporkan terpisah; `doubleCountRisk` benar hanya bila keduanya > 0 |
| Web | tabel semantik: `getByRole('table')`, `columnheader` berjumlah 6 |
| Web | sel variance memuat tanda `+`/`−` sebagai teks, bukan hanya warna |
| Web | hanya satu format uang: `Rp 0` tidak muncul saat data gagal dimuat |
| Web | klik baris membuka inspector inline dengan `aria-expanded` |
| Web | empty state tanpa baseline menampilkan aksi Freeze |
| E2E | `POST /publish` lama tetap berfungsi (alias freeze) |
| Manual VPS | 12 proyek nyata, termasuk PRJ-029/030 (tanpa budget) dan PRJ-014 (PV = 0) |

## 9. Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| **Double count material tetap ada** | Ditampilkan eksplisit lewat `reconciliation`; perbaikan jadi spec sendiri dengan pengujian dampak CPI/SPI semua proyek. Tidak diperbaiki diam-diam |
| `actual` per WBS **turun** dibanding halaman lama (jurnal 610* tidak lagi ditambahkan) | Perubahan disengaja dan dinyatakan di §4.5; `reconciliation` menampilkan selisihnya secara terbuka; diuji dengan nilai seed yang diketahui |
| `actual` halaman Budget ≠ AC dashboard sampai spec lanjutan selesai | Selisih dilaporkan lewat `reconciliation.doubleCountRisk`, bukan didiamkan; §4.5 menyatakan konsekuensi ini eksplisit |
| Backfill baseline menyentuh data yang ada | Hanya `INSERT` baseline dari `BudgetItem` yang ada; `BudgetItem` tidak diubah; idempoten |
| 15 berkas non-spec membaca `budgetItem.*` | Semantik dipertahankan, nilai tidak berubah (§4.2); diverifikasi dengan perintah yang sama seperti fakta #15 |
| `POST /publish` dipakai e2e lama | Dipertahankan sebagai alias `freeze` |
| Enam kolom angka menyulitkan di 1366px | Kolom WBS sticky + scroll horizontal; inspector inline, bukan rail kanan |
| Migrasi baseline ganda bila dijalankan ulang | `@@unique([projectId, version])` + `WHERE NOT EXISTS` |

## 10. Rollback

`git revert` untuk kode. Migrasi bersifat aditif (dua tabel dan dua kolom baru,
plus `INSERT` baseline hasil salinan), sehingga `BudgetItem` tidak pernah
kehilangan data bila di-revert. Bila perlu mundur penuh, `DROP TABLE
"BudgetBaselineLine"`, `DROP TABLE "BudgetBaseline"`, dan `ALTER TABLE
"Subcontract" DROP COLUMN "wbsItemId"` — tidak ada data sumber yang hilang.

## 11. Dekomposisi

Terlalu besar untuk satu plan. Tiga tahap, masing-masing dapat dirilis sendiri:

1. **A — Baseline truth**: skema, migrasi, `budget-baseline.ts`,
   `budget-baseline.service.ts`, kontrak, seed. Belum ada perubahan visual.
   Hasil: baseline nyata dan dapat diuji lewat API.
2. **B — Statement page**: `budget-statement.tsx` dan turunannya, formatter
   tunggal, ramp warna aksesibel, inspector inline. Memakai A.
3. **C — Komitmen & proyeksi**: `Subcontract.wbsItemId` diisi di seed, kolom
   committed, baris EAC/VAC, rekonsiliasi.

Spec lanjutan yang terpisah: **perbaikan double-count actual cost** (§9).

