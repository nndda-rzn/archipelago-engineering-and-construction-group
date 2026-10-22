# Budget Workspace — Design

Tanggal: 2026-10-22
Status: disetujui untuk implementasi

## 1. Tujuan

Halaman Budget saat ini adalah tabel datar yang menyembunyikan sebagian besar
datanya. Dokumen ini menetapkan bagaimana halaman itu menjadi **workspace
alokasi biaya**: pohon WBS dengan rollup, komposisi cost type, serapan biaya
nyata, dan kontrol kewajaran.

Definisi sukses — orang dapat menjawab tiga pertanyaan tanpa membuka halaman lain:

1. Di mana uang dialokasikan? (pohon WBS + cost type)
2. Berapa yang sudah terpakai dan berapa sisa? (baseline vs actual per simpul)
3. Apakah masih masuk akal? (total vs kontrak, simpul tanpa budget, PV vs BAC)

## 2. Kondisi awal (terukur dari DB VPS, 2026-10-22)

| Fakta | Nilai |
| --- | --- |
| `BudgetItem` per proyek | 4 — satu per `costType` (LABOR, MATERIAL, SUBCONTRACTOR, EQUIPMENT) |
| `costType` yang tampil di UI | **0** — dibuang di service dan tidak ada di kontrak |
| `BudgetItem.version` | hanya `1`; tidak ada riwayat baseline |
| `StockLedgerEntry.wbsItemId` terisi | **1 dari 29** |
| `JournalLine.wbsItemId` terisi | **0 dari 8** |
| `ControlAccount.plannedValue` vs BAC | PRJ-014: 0 vs 4,8 T · proyek lain: 60% BAC |

### 2.1 Bug: `upsert` membuat baris kelima

`BudgetService.upsert` memakai `costType = dto.costType ?? 'DIRECT'`, sedangkan
UI tidak pernah mengirim `costType`. Setiap penyuntingan dari UI membuat baris
`DIRECT` baru di samping 4 baris yang sudah ada, sehingga total membengkak dan
baris lama tetap. Tidak terdeteksi karena **tidak ada satu pun test budget**.

## 3. Ruang lingkup

Termasuk:

- Bawa `costType` ke kontrak, rollup pohon, `used` per simpul, peringatan kewajaran.
- Perbaiki `upsert` agar `costType` wajib dan memperbarui baris yang benar.
- Isi dimensi WBS pada seed (dan backfill data yang sudah ada).
- Bangun ulang UI Budget sebagai pohon + inspector.

Tidak termasuk (dicatat sebagai lanjutan):

- Riwayat versi baseline (butuh tabel/kolom baru + alur status).
- Alur approval sebelum publish.
- Perbaikan nilai `ControlAccount.plannedValue` (ditampilkan sebagai peringatan,
  bukan diperbaiki diam-diam — lihat §7).

## 4. Keputusan desain

### 4.1 Dimensi WBS diisi menurut sumber biaya, bukan dibagi rata

Semua entri `StockLedgerEntry` adalah pergerakan **material** (GR / ISSUE /
ADJUSTMENT). Maka alokasi yang jujur adalah material → WBS material.

| Sumber | Diisi | Dasar |
| --- | --- | --- |
| `StockLedgerEntry.wbsItemId` | WBS dengan `code = '2'` (Procurement) | seluruh entri ledger adalah pergerakan material |
| `JournalLine.wbsItemId` | WBS material untuk baris akun `610*` | akun 6100 = Beban Material |

Konsekuensi yang **disengaja**: WBS selain material akan menunjukkan `used = 0`.
Itu fakta, bukan cacat. Halaman menampilkan cakupan secara eksplisit
(`costCoverage`) alih-alih menyamarkan nol. Membagi rata ke seluruh WBS akan
mengarang angka, dan itu ditolak.

### 4.2 `used` dihitung per WBS, bukan level proyek

`used` per simpul = `SUM(ABS(totalValue))` dari `StockLedgerEntry` dengan
`movementType = 'OUT'` untuk `wbsItemId` simpul itu (termasuk keturunannya),
ditambah debit `JournalLine` akun `610*` untuk WBS yang sama.

Ini konsisten dengan `ActualCostCalculator` (ledger + jurnal beban), tetapi
berdimensi WBS. Angka level proyek tetap sama seperti sebelumnya — diverifikasi
sebelum perubahan (PRJ-020: 1.042.727.272.727 dari ledger, tanpa dobel hitung
dengan invoice).

### 4.3 Rollup dihitung, tidak disimpan

`budget` dan `used` sebuah induk = jumlah seluruh keturunannya, dihitung saat
query. Tidak ada kolom rollup baru, jadi tidak ada risiko data turunan basi.

### 4.4 `costType` wajib

`upsertBudgetSchema.costType` menjadi wajib. Permintaan tanpa `costType`
ditolak `400`, bukan diam-diam menjadi `'DIRECT'`. Ini menutup bug §2.1 di
sumbernya.

### 4.5 PV ditampilkan, tidak disembunyikan

`ControlAccount.plannedValue` dipakai sebagai PV per simpul. Karena nilainya
tidak seimbang dengan BAC pada data saat ini, halaman menampilkan peringatan
`pvMismatch` dan **tidak** memakai PV untuk menghitung SPI di halaman ini.

## 5. Arsitektur

### 5.1 Kontrak (`packages/api-contracts/src/project.ts`)

Aditif — field lama dipertahankan supaya konsumen lain tidak rusak.

```ts
export const costTypeKeySchema = z.enum([
  'DIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'INDIRECT', 'OVERHEAD',
]);

budgetSummarySchema:
  projectId: string
  status: 'DRAFT' | 'PUBLISHED'
  wbs: Array<{
    id, code, name,
    parentId: string | null,
    depth: number,
    budget: number,
    used: number,
    remaining: number,
    byCostType: Partial<Record<CostTypeKey, number>>,
    plannedValue: number,
    itemCount: number,
    childrenCount: number,
  }>
  totalBudget: number                 // dipertahankan (kompatibilitas)
  totals: { budget, used, remaining, contractValue, variance }
  warnings: {
    overContract: boolean
    overAllocated: Array<{ wbsId, code, amount }>
    noBudget: Array<{ wbsId, code }>
    pvMismatch: { pv: number, bac: number, ratio: number } | null
  }
  costCoverage: { allocatedNodes: number, totalNodes: number }
```

`upsertBudgetSchema.costType`: `costTypeKeySchema` (wajib).

### 5.2 Service (`budget.service.ts`)

`findAll(projectId)`:

1. Ambil `wbsItem` proyek, urut `sortOrder, code`; hitung `depth` dari rantai `parentId`.
2. Ambil `budgetItem` proyek; kelompokkan `(wbsItemId, costType)`.
3. Ambil agregat `stockLedgerEntry` `movementType='OUT'` per `wbsItemId`.
4. Ambil agregat `journalLine` debit per `wbsItemId` untuk akun `code LIKE '610%'`.
5. `used` per simpul = ledger + jurnal; lalu rollup ke leluhur.
6. `budget` per simpul = jumlah `byCostType`; lalu rollup ke leluhur.
7. Susun `warnings` dan `costCoverage`.

`upsert(projectId, dto, actorId)`: `costType` wajib; tetap menolak bila baris
sudah `PUBLISHED` (`409 BUDGET_PUBLISHED`, perilaku lama dipertahankan).

Fungsi murni yang diekspor untuk pengujian tanpa DB:

- `buildBudgetTree(items, budgetRows, usedRows)` → `wbs[]` ber-rollup
- `collectWarnings(totals, wbs)` → `warnings`

### 5.3 Seed dan backfill

- `seed-demo.ts`: setiap `stockLedgerEntry.create` diberi `wbsItemId` WBS material;
  `journal.create` untuk beban material diberi `wbsItemId` pada baris 6100.
  Idempoten — hanya berlaku saat baris dibuat.
- Migration data baru: `backfill_wbs_dimension` — mengisi `wbsItemId` yang masih
  `NULL` pada kedua tabel dengan aturan yang sama. Aman dijalankan berulang
  (`WHERE wbsItemId IS NULL`).

### 5.4 UI

Arah visual: **ledger teknis / blueprint**. Rapat, presisi, tipografi mono untuk
seluruh angka, garis tipis sebagai struktur, tanpa bayangan dekoratif.

Elemen khas: **bilah alokasi bertumpuk** per simpul — satu garis horizontal
dibagi empat segmen menurut cost type, dengan penanda tegak pada posisi serapan.

```
Procurement                        2.100 M   ███▓▓▓░░░│░░   44%
  2.1  Long-lead Items               945 M   ████▓▓░░░│░░   90%
  2.2  Bulk Materials              1.155 M   ██▓░░░░░░│░░   20%
                                 ─────────────────────────
Total                              4.800 M              Rp 4,8 T
```

Komponen:

| Komponen | Tanggung jawab |
| --- | --- |
| `cost-type-bar.tsx` | satu bilah bertumpuk; aman untuk 0/1/4 segmen |
| `budget-tree.tsx` | pohon WBS, lipat/buka, rollup, seleksi |
| `budget-inspector.tsx` | panel kanan: rincian cost type, PV, used, form edit |
| `budget-status.tsx` | status + publish + peringatan kewajaran |
| `budget.page.tsx` | pemilihan proyek, ringkasan, peringatan, komposisi layout |

Aksesibilitas:

- Setiap baris pohon adalah tombol yang dapat difokus, dengan `aria-expanded`
  untuk induk dan `aria-current` untuk simpul terpilih.
- Bilah bertumpuk diberi `role="img"` + `aria-label` berisi komposisi dalam teks,
  karena warna saja tidak cukup.
- Kontras teks ≥ 4,5:1; tidak memakai `neutral-400` untuk teks.

## 6. Pengujian

| Lapisan | Kasus |
| --- | --- |
| Unit service | rollup induk = jumlah anak; `byCostType` menjumlah tepat; `used` = ledger + jurnal; `collectWarnings` pada overContract/noBudget/pvMismatch |
| Unit service | `upsert` tanpa `costType` → 400; `upsert` dengan cost type sama → memperbarui, bukan menambah baris |
| Unit web | `cost-type-bar` 0/1/4 segmen; `budget-tree` hierarki + `aria-expanded`; form mengirim cost type |
| E2E | `publish` pada budget terpublish tetap `409 BUDGET_PUBLISHED` |
| Manual VPS | 12 proyek nyata, termasuk PRJ-029/030 (tanpa budget) dan PRJ-014 (PV=0) |

## 7. Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| `used = 0` di WBS non-material terlihat seperti bug | `costCoverage` ditampilkan eksplisit; label menjelaskan biaya hanya teralokasi pada WBS material |
| Backfill menyentuh data yang ada | hanya `WHERE wbsItemId IS NULL`; dijalankan setelah hitungan diverifikasi di VPS; `db:setup` ulang menghasilkan kondisi sama karena seed ikut diperbaiki |
| PV tidak seimbang dengan BAC | ditampilkan sebagai peringatan, tidak dipakai menghitung SPI di halaman ini; perbaikan PV menjadi PR lanjutan |
| `costType` wajib memutus klien lama | hanya ada satu klien (web di repo ini) dan sudah diperbarui dalam PR yang sama |

## 8. Rollback

`git revert`. Migration backfill bersifat aditif (mengisi `NULL`), sehingga tidak
ada data yang hilang bila di-revert; kolom tetap ada dan tetap `NULL` untuk baris
baru sampai seed berikutnya.
