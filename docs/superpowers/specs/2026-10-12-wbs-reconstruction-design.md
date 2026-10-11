# WBS Reconstruction — Design Spec

> Design spec. Status: **approved for implementation** (2026-10-12).
> Rekonstruksi UI/UX + FE + BE + DB untuk WBS, menyusul standar yang sudah
> dipakai pada tab halaman detail proyek.
> Rencana tugas: `docs/superpowers/plans/2026-10-12-wbs-reconstruction.md`.

---

## 1. Konteks

Halaman `/wbs` ("Work Breakdown Structure") hari ini adalah **stub create-only**.
Model DB sudah disiapkan untuk progress & jadwal, tetapi tidak ada yang menulis,
mengekspos, atau memakainya.

| # | Temuan | Bukti |
|---|---|---|
| 1 | `WbsItem.progressPercent`, `plannedStart`, `plannedEnd` **mati** — tak ada penulis/pembaca | `schema.prisma:648-652`; `wbs.service.ts` hanya `getTree`/`create` |
| 2 | BE hanya punya `GET` + `POST` — tak ada update/delete/move | `wbs.controller.ts:14-28` |
| 3 | `Permission.WbsEdit` **mati** (0 endpoint memakainya) | `permissions.ts:175` |
| 4 | Kontrak tak mengekspos progress/tanggal | `project.ts:329-346` |
| 5 | FE tree hanya `code · name · + Sub`; tak ada progress, tanggal, rollup, search, detail | `wbs-tree.tsx:52-69` |
| 6 | Form create **membuang `description` diam-diam** padahal skemanya menerimanya | `wbs-form.tsx:11-14` vs `project.ts:351` |
| 7 | Chevron `h-3.5` hardcoded (bukan `ICON_SIZE`); "+ Sub" merah (`racing-red-600`) — merah = aksi, bukan navigasi | `wbs-tree.tsx:61,68` |
| 8 | Hapus node bisa **cascade budget/cost code/control account** diam-diam | `schema.prisma:682,721,2668` (`onDelete: Cascade`) |

**Definisi actual per-WBS sudah ada di repo:** `stockLedgerEntry` movement `OUT`
per `wbsItemId` (`project-health.service.ts:44-54`). Rollup **wajib** memakai
definisi yang sama agar dua permukaan tidak saling bertentangan.

## 2. Tujuan & non-tujuan

**Tujuan:**
1. WBS jadi **permukaan manajemen nyata**: hierarki + progress + jadwal + rollup biaya.
2. FE + BE + DB semuanya berperan; **tidak ada kolom mati**.
3. Rollup **dihitung server** dan ditampilkan read-only terpisah dari nilai yang diisi user.
4. Hapus aman & jujur: tolak dengan pesan jelas bila ada dokumen tertaut.
5. Ikon & warna sesuai token; a11y & states lengkap.

**Non-tujuan:** menjadikan WBS sumber kebenaran Gantt/EVM (menolak opsi *schedule backbone*),
drag-and-drop penuh, import/export, dark mode, mengubah halaman lain.

## 3. Keputusan terkunci

| Keputusan | Pilihan |
|---|---|
| Kedalaman | Full WBS workspace, **self-contained** (tanpa rewiring Gantt/EVM) |
| Tulis & rollup | Input manual di node; rollup berbobot budget, **dihitung server** |
| IA | Tetap standalone `/wbs` + deep-link `?project=<id>` |
| API | REST **granular** (`PATCH`/`DELETE`/`POST move`), audit per-item |
| FE | **Split master–detail**: tree + inspector kanan |
| DB | Migrasi **aditif**: `responsibleManager`, `isMilestone` |
| PR | 3 PR per-layer (schema → api → ui) |

## 4. Data model

Tambahan aditif pada `WbsItem`:

| Kolom | Tipe | Alasan |
|---|---|---|
| `responsibleManager` | `String?` | Akuntabilitas per node (permukaan manajemen butuh pemilik) |
| `isMilestone` | `Boolean @default(false)` | Penanda milestone di tree |

`onDelete` relasi **tidak diubah** (mengubah cascade berisiko memutus rantai hapus
project). Bahaya cascade ditangani **guard di service**, bukan di schema.

## 5. Kontrak (`packages/api-contracts`)

`wbsItemSchema` diperluas (aditif):
`progressPercent: number`, `plannedStart: string|null`, `plannedEnd: string|null`,
`responsibleManager: string|null`, `isMilestone: boolean`, dan blok read-only
`rollup: { budget: number; actual: number; progress: number|null; childCount: number }`.

`createWbsItemSchema` & `updateWbsItemSchema` menerima field baru (opsional).

## 6. Backend

| Method | Path | Fungsi | Permission |
|---|---|---|---|
| `GET` | `/projects/:id/wbs` | Tree + rollup per node (diperluas) | `WbsView` |
| `POST` | `/projects/:id/wbs` | Create (terima field baru) | `WbsCreate` |
| `PATCH` | `/projects/:id/wbs/:itemId` | Update name/desc/progress/dates/owner/milestone | `WbsEdit` |
| `DELETE` | `/projects/:id/wbs/:itemId` | Hapus — **guard 409** bila ada dokumen tertaut | `WbsEdit` |
| `POST` | `/projects/:id/wbs/:itemId/move` | Reparent + reorder — **tolak siklus** | `WbsEdit` |

**Rollup (server-side, read-only):**
- `budget` = budget node + Σ rollup anak.
- `actual` = actual node (stock ledger `OUT` per `wbsItemId`) + Σ rollup anak.
- `progress` = rata-rata berbobot budget dari progress anak; leaf = `progressPercent` sendiri;
  parent tanpa budget = rata-rata sederhana; node tanpa anak & tanpa progress → `null`.

**Guard hapus:** hitung dokumen tertaut untuk node **dan seluruh keturunannya**
(BudgetItem, CostCode, ControlAccount, PurchaseRequisition, PurchaseOrderItem,
GoodsReceiptItem, MaterialIssueItem, StockLedgerEntry, StockAdjustmentItem,
StockOpnameItem, StockTransferItem, JournalLine, RfqItem, ConstructionWorkPackage,
Timesheet). Bila > 0 → 409 `WBS_HAS_LINKS` dengan jumlah per jenis.

**Guard move:** tolak `WBS_CYCLE` (400) bila target parent adalah node sendiri atau keturunannya.

## 7. Frontend

### 7.1 Struktur `/wbs` (split master–detail)

```
Header: judul + ProjectPicker (deep-link ?project=)
Toolbar: search · filter · expand/collapse · [+ Add root]
┌ TREE (master) ─────────────┬ INSPECTOR (detail) ─────────────────┐
│ code · name · progress bar │ Code · Owner · Milestone toggle     │
│ · Money compact (rollup)   │ Progress · Planned start/end        │
│ chevron + milestone flag   │ Description                         │
│ seleksi bg-neutral-100     │ Rollup (read-only) + Linked docs    │
└────────────────────────────┴─────────────────────────────────────┘
```

### 7.2 Tree
- Kolom: indentasi + chevron, `code` (mono), `name` (truncate + `title`),
  **progress** (bar + % teks), **rollup budget** (`Money` compact, full di `title`).
- Baris terpilih: `bg-neutral-100` + `aria-selected` (bukan merah).
- Ikon chevron & milestone dari `ICON_STROKE`/`ICON_SIZE` (`@aec/ui`).
- Hapus `racing-red-600` pada "+ Sub" → tombol ghost netral.

### 7.3 Inspector
- Form: progress (slider + input 0–100), tanggal (date), owner, description, milestone toggle.
- Simpan via `PATCH`; optimistic + invalidasi tree.
- **Rollup read-only** ditampilkan terpisah; catatan bila node punya anak.
- **Dokumen tertaut**: hitungan per jenis + tautan ke halaman domain.
- **Hapus** via `ConfirmDialog`; bila 409, tampilkan berapa dokumen menghalangi.

### 7.4 States (wajib)
Empty (belum pilih proyek / proyek kosong), loading (`Skeleton`), error (`ErrorState` + retry),
overflow (truncate). Semua angka `font-mono tabular-nums`.

## 8. Test

- **API unit** (`*.spec.ts`): update, guard hapus, siklus move, rollup (weighted vs simple).
- **Web**: tree (rollup, seleksi, token, milestone), inspector (edit→PATCH, rollup read-only,
  dokumen tertaut), page (empty/loading/error/deep-link), form (description tak lagi dibuang).

## 9. Verifikasi

- API unit + e2e, Web test, typecheck, lint, build — hijau.
- **DOM live CDP**: 0 overflow nyata + tanpa scroll horizontal di `/wbs`; tree bisa keyboard-navigasi.
- Merged-tree gate tiap merge ke `develop`. DB demo via `pnpm --filter @aec/api db:reset`.

## 10. Rollback

`git revert` per PR. Migrasi aditif → aman.
