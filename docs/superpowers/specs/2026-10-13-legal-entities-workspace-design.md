# Legal Entities Management Surface — Design Spec

> Design spec. Status: **approved for implementation** (2026-10-13).
> Melanjutkan konvensi Foundation (FR-FND-001) dan bahasa visual Control Tower.
> Rencana tugas: `docs/superpowers/plans/2026-10-13-legal-entities-workspace.md`.

---

## 1. Konteks

`/foundation/legal-entities` (`apps/web/src/pages/foundation/legal-entity-list.page.tsx`)
kini hanya daftar + form tambah minimal. Legal Entity adalah **hub** yang mengikat
projects, users, organizations, chart of accounts, bank accounts, DOA, period-close,
dan intercompany — tetapi UI tidak memperlihatkannya, backend minim guard/audit, dan
skema punya celah integritas.

| # | Temuan | Bukti |
|---|---|---|
| 1 | UI tanpa search, padahal BE + hook mendukung `search` | `legal-entity.service.ts:18-28`, `legal-entity.api.ts:26` |
| 2 | Tak ada Edit (BE `PATCH :id` ada, hook/UI tak ada) | `legal-entity.controller.ts:34` |
| 3 | Tak ada Block/Unblock UI (BE `POST :id/block` ada) | `legal-entity.controller.ts:40` |
| 4 | Form tak merender currency (padahal di schema); `fiscalCalendar` tak pernah bisa diisi | `legal-entity-form.tsx:13-14,29-32` |
| 5 | Tak ada filter status; state daftar tak di URL | `legal-entity-list.page.tsx:10-11` |
| 6 | Tak ada detail/drill-through padahal entity = hub | relasi `LegalEntity` di `schema.prisma` |
| 7 | `LegalEntityService` **tak menulis AuditLog** (langgar konvensi repo) | `legal-entity.service.ts` (tak menyuntik `AuditService`) |
| 8 | `block()` pakai `update` biasa — bukan compare-and-set | `legal-entity.service.ts:78-81` |
| 9 | `User`, `Organization`, `Equipment` punya `legalEntityId` **tanpa** index | `schema.prisma` (bandingkan Project/COA/BankAccount yang punya) |
| 10 | `status` string bebas, bukan enum; `functionalCurrency`/`reportingCurrency` tanpa FK ke `Currency` | `schema.prisma:22-25` |
| 11 | Tabel `Currency` **kosong** — tak pernah di-seed | `prisma.currency.*` tak ada di `seed.ts`/`seed-demo.ts` |

## 2. Tujuan & non-tujuan

**Tujuan:**
1. Daftar yang bisa dicari, difilter, dan dibagikan (state di URL).
2. Halaman detail: profil lengkap + "digunakan di mana" (usage) + lifecycle (aktif/blokir).
3. Form lengkap (currency + fiscalCalendar) dengan validasi.
4. Integritas DB ditegakkan: enum status + FK currency + index.
5. Kepatuhan audit trail untuk setiap mutasi.

**Non-tujuan:** governance/readiness gate, audit viewer baru, dark mode, mengubah halaman lain.

## 3. UI — arsitektur informasi

### 3.1 Daftar — `/foundation/legal-entities` = "Group register"

- **Toolbar**: Search (debounce 300ms) + filter **Status** (`SegmentedControl`) + tombol **+ Add entity** (satu primary action). State `page/sort/search/status` di URL.
- **Register** = `<table>` semantik (`<thead>/<th scope>`, baris fokusabel) dengan perlakuan visual **hairline** (bukan kotak/zebra). Kolom:
  - Identitas: `EntityAvatar` + kode (mono) + nama legal;
  - **Skala**: `BulletBar` (skala bersama antar-entity) — pangsa atas satu ukuran grup;
  - **Komposisi**: `StackedBar` (footprint proyek·user·akun per entity);
  - Status: `StatusBadge`; Meta: negara + mata uang (mono).
- Klik baris → detail. Kolom kunci dapat disortir.

### 3.2 Detail — `/foundation/legal-entities/$entityId`

- **Header**: tombol kembali · identitas · `StatusBadge` · aksi **Edit / Blokir / Aktifkan** (sesuai status & izin).
- **Footprint band**: satu `StackedBar` bersegmen (proyek·user·org·COA·bank·periode) + angka — bukan mosaik kartu.
- **Posture**: kas / AR-AP / nilai kontrak entity-scoped sebagai `BulletBar`/waterfall.
- **Readiness strip**: COA · periode terbuka · DoA · kalender fiskal — menampilkan celah secara jujur.
- **Profil**: `<dl>` semua field (termasuk functionalCurrency, reportingCurrency, fiscalCalendar).
- **Blokir**: `ConfirmDialog` berisi ringkasan usage (peringatan soft, tetap boleh lanjut).

### 3.3 Dasar pemilihan visual (bukan selera)

| Keputusan | Dasar |
|---|---|
| Register/list, bukan card grid | NN/g *Data Tables* (kartu memaksa reorientasi → komparasi lambat); UX Patterns *Table vs List vs Card Grid* |
| Baris = "rich list row" | Adamarant *Table vs card*; NN/g *Anatomy of a List Entry* |
| `BulletBar` untuk nilai-vs-pembanding | Stephen Few *Bullet Graph Design Spec* |
| `StackedBar` untuk komposisi | Few (part-to-whole per kategori) |
| Hairline, bukan kotak/zebra | `no-slop-ui` (banned: metric-card grid, zebra); Tufte data-ink |
| Satu aksen, hierarki via opacity | prinsip `swiss-design` memakai token repo |
| Semua state + a11y | `design-standards`, `frontend-component-build`, WCAG 2.2 AA |

**Batas keras (mengikat):** token repo saja (tanpa hex/font baru); tanpa gradien/glow/animasi entrance; bukan metric-card grid; kontras teks ≥ 4.5:1 & boundary ≥ 3:1; target ≥ 44px mobile (≥24px minimum); `font-mono tabular-nums` untuk angka; elipsis `…`; `focus-visible:ring`; `motion-safe`.

## 4. Backend (fungsionalitas)

1. **CAS pada transisi status** — `block` = `updateMany({ where: { id, status: { not: 'BLOCKED' } } })` + cek `count`; `unblock` = `updateMany({ where: { id, status: 'BLOCKED' } })`. `unblock` pada non-BLOCKED → 409 `INVALID_STATUS_TRANSITION`.
2. **`findAll`**: filter `status` + sertakan `metrics` per entity (`groupBy` per relasi — bukan N+1). `search` yang sudah didukung BE kini dipakai UI.
3. **Endpoint baru**: `GET :id/usage` (ringkasan lintas domain), `POST :id/unblock`; `POST :id/block` mengembalikan `usage`.
4. **Audit trail**: `LegalEntityService` menyuntik `AuditService` → `LEGAL_ENTITY.CREATE/UPDATE/BLOCK/UNBLOCK` (oldValue→newValue, aktor dari `@Req().user.sub`).
5. **Validasi boundary**: status ∈ `MasterDataStatus`; currency = 3 huruf A-Z; `fiscalCalendar` ∈ himpunan sah.

## 5. Database (enum + FK + backfill)

Migrasi berurutan (aman, idempoten):

1. **Seed + backfill `Currency`** — tabel saat ini kosong. Buat baris `Currency` untuk kode yang muncul di seed: **IDR, USD**.
2. **Kolom FK** `functionalCurrencyId` / `reportingCurrencyId` (`String?`, FK → `Currency.id`, `onDelete: Restrict`) pada `LegalEntity`; **backfill** dari `Currency.code` yang cocok; kolom string lama dipertahankan sementara (kompatibilitas baca).
3. **Enum Prisma `LegalEntityStatus`** = `DRAFT | PENDING_REVIEW | ACTIVE | BLOCKED | INACTIVE | ARCHIVED` (cermin `MasterDataStatus` di `@aec/shared-types`) + konversi kolom `status` `String → LegalEntityStatus` (cast + backfill; nilai existing hanya `ACTIVE`/`BLOCKED`).
4. **Index**: `User.legalEntityId`, `Organization.legalEntityId`, `Equipment.legalEntityId`, `LegalEntity.status`.
5. **`fiscalCalendar`** tetap `String` — himpunan nilai sah belum ada di kode (hanya default `STANDARD`); **tidak dikarang**. Divalidasi di boundary.

**Kode yang menyertai (wajib karena tipe berubah):**
- `create/update` DTO menerima `functionalCurrencyId`/`reportingCurrencyId` (opsional) **dan** tetap menerima kode string (di-resolve ke id).
- Kontrak `@aec/api-contracts`: `LegalEntity` + `functionalCurrencyId`/`reportingCurrencyId` (nullable); status union `LegalEntityStatus`.
- Verifikasi semua pembacaan `legalEntity.status` (grep: nol pembaca di luar skema).

**Rollback:** setiap migrasi punya langkah turun (drop FK → drop kolom → drop enum → drop index); baris `Currency` tidak dihapus (data).

## 6. Kontrak & endpoint

- `legalEntityUsageSchema` + tipe: `{ projects, users, organizations, chartOfAccounts, bankAccounts, periodCloses, employees, equipment, generatedAt }`.
- `updateLegalEntitySchema` (Partial dari create).
- `status?` di `legalEntityListParamsSchema`.
- `legalEntitySchema`: + `functionalCurrencyId`/`reportingCurrencyId`; `status` → union `LegalEntityStatus`.

## 7. Error handling

- BE: kode SCREAMING_SNAKE (`LEGAL_ENTITY_NOT_FOUND`, `LEGAL_ENTITY_EXISTS` sudah ada; `INVALID_STATUS_TRANSITION` baru).
- FE: setiap surface menangani loading/error/empty sebelum render; aksi lifecycle → toast + invalidate query.

## 8. Testing & gate

- **API unit**: usage/unblock/block+usage/filter-status/audit; validasi enum & currency; CAS double-action.
- **Migrasi**: diuji lewat `prisma migrate reset` (E2E global-setup) + `migrate deploy` pada DB berisi data (backfill).
- **Web (Vitest)**: toolbar (search debounce + filter), register (semantik tabel + fokusabel + sort), profil, usage, lifecycle (ConfirmDialog menampilkan dampak), page daftar & detail; a11y (label, keyboard, heading tanpa lompatan).
- **Gate**: `pnpm --filter @aec/api test:unit` · `pnpm --filter @aec/web test` · `pnpm lint` · `pnpm typecheck`.

## 9. Pemecahan PR

| PR | Isi | Bergantung |
|---|---|---|
| 1 | **DB**: migrasi seed+backfill Currency, kolom FK, enum status, index + update kode & kontrak terkait | — |
| 2 | **BE**: service (usage/unblock/block+usage/filter/CAS/audit/validasi) + DTO + controller + unit test | PR 1 |
| 3 | **FE daftar**: hooks + toolbar + register (semantik tabel) + form lengkap + URL state | PR 1,2 |
| 4 | **FE detail**: profil + footprint/posture/readiness + lifecycle + route + `statusMeta.BLOCKED` | PR 1,2 |

PR 1 harus lebih dulu karena enum/FK mengubah tipe yang dipakai PR 2.

## 10. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Migrasi enum gagal karena nilai tak terduga | Backfill memetakan nilai; tolak nilai tak dikenal sebelum cast |
| FK currency gagal karena `Currency` kosong | Seed+backfill Currency **sebelum** menambah FK |
| Perubahan tipe memecah kode lintas modul | grep semua `legalEntity.status` + typecheck penuh |
| Enum jadi "enum pertama" di repo | Keputusan sadar; konsisten dengan `MasterDataStatus` |
| Blokir entity yang dipakai | Peringatan soft + usage di dialog |
| Query usage N+1 | Satu `$transaction` paralel `count`/`groupBy` |

## 11. Kriteria penerimaan

1. Register terbaca & dapat dibandingkan (semantik tabel + encoding `BulletBar`/`StackedBar`).
2. Detail: footprint/posture/readiness + profil lengkap + usage (nol jujur).
3. Search + filter status + URL state; edit/blokir/aktifkan (CAS + audit).
4. DB: enum status & FK currency ditegakkan; index ada; migrasi naik-turun bersih.
5. Setiap mutasi teraudit; semua state + a11y; gate hijau.

## 12. Referensi

- Skill: `ux-designer`, `design-standards`, `frontend-component-build`, `swiss-design`, `no-slop-ui`, `frontend-design`.
- Sumber eksternal: NN/g *Data Tables* & *Anatomy of a List Entry*; UX Patterns *Table vs List vs Card Grid*; Grafana *Lists of objects*; Stephen Few *Bullet Graph Design Spec* & *Information Dashboard Design*.
- `docs/architecture/CODEBASE-MAP.md`, `docs/quality/FINDINGS.md`.
- `apps/api/src/modules/foundation/*`, `apps/web/src/features/foundation/*`, `apps/api/prisma/schema.prisma`.

---

*Disusun dari analisis codebase pada branch `develop`.*
