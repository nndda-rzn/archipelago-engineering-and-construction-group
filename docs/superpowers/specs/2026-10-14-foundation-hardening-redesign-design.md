# Foundation Hardening Redesign — Design Spec

> Design spec. Status: **approved for implementation** (2026-10-14).
> Melanjutkan bahasa visual Control Tower (ledger grid, micro-chart) dan
> pola tab-in-URL yang dipakai halaman domain lain.
> Rencana tugas: `docs/superpowers/plans/2026-10-14-foundation-hardening-redesign.md`.

---

## 1. Konteks

`/foundation/hardening` ("Foundation Hardening") kini 3 tab (`useState`), judulnya
menjanjikan *"effective-dated org, DoA engine, currency, IFC control, readiness gate"* —
padahal IFC & readiness milik domain engineering/construction. Halaman ini juga menyimpan
**bug nyata** dan dead code.

| # | Temuan | Bukti |
|---|---|---|
| 1 | **Struktur organisasi rusak.** BE mengembalikan `roots` sebagai tree (`TreeNode={item,children}`), FE mem-parse `roots` sebagai array datar → Zod gagal → section kosong tanpa error | `organization.service.ts:49-50` (`buildTree`), `foundation-hardening.api.ts:26` (`organizationSchema.array().parse(data.roots)`) |
| 2 | Org tak bisa punya hierarki (tak ada pemilih `parentId`) | `org-form.tsx:9-13` |
| 3 | **Dead code no-op**: `const parsed = resolveDoaSchema.parse; void parsed;` — validasi hilang | `foundation-hardening.api.ts:67-68` |
| 4 | Readiness gate tak dirender; hook `useReadiness` mati | `foundation-hardening.page.tsx`, `foundation-hardening.api.ts:127-136` |
| 5 | IFC hanya angka total/released, tanpa daftar drawing / state | `foundation-sections.tsx:92` |
| 6 | Resolve DoA tak mengirim konteks (entity/BU/project/currency/risk) padahal BE memfilternya | `doa-form.tsx:102-108`, `doa.service.ts:46-56` |
| 7 | DoA tak bisa edit/nonaktif; kolom status/effective/priority tak tampil | `foundation-sections.tsx:21-30` |
| 8 | Tab `useState` (tak dibagikan); tab aktif memakai `racing-red-600` (merah = aksi, bukan seleksi) | `foundation-hardening.page.tsx:13,45-46` |
| 9 | Currency: symbol/decimals tak dirender; rate tanpa `effectiveDate`; tak ada status | `currency-form.tsx` |
| 10 | Inkonsisten: currency pakai `DataGrid`, org/DoA/rate pakai tabel tangan tanpa loading/error/empty seragam | `foundation-sections.tsx` |
| 11 | Tak ada search/filter/sort | seluruh section |
| 12 | Form tak `onBlur`; layout `flex` sejajar berisiko overflow sempit | `*-form.tsx` |

## 2. Tujuan & non-tujuan

**Tujuan:**
1. Halaman sesuai domainnya: **Organization · Delegation of Authority · Currency & Exchange Rate**.
2. **Visual kaya, bukan kotak/tabel polos** — setiap bentuk dipilih dari fungsi data.
3. Fungsional penuh di ketiga area (kelola + analisis).
4. Perbaiki bug (#1, #3) dan hapus duplikasi domain (#4, #5).
5. Konsisten dengan design system & konvensi repo (tab URL, seleksi netral, a11y).

**Non-tujuan:** IFC control & readiness gate (dikeluarkan), audit viewer, dark mode,
mengubah halaman lain.

## 3. Struktur informasi — 3 tab (state di URL `?tab=`)

| Tab | Fungsi data | Bentuk utama |
|---|---|---|
| **Organization** | Hierarki + waktu | Toggle `[Structure | Timeline]` |
| **Delegation of Authority** | Ambang nominal → level | **Tangga wewenang** + analisis + simulator |
| **Currency & Exchange Rate** | Tren + matriks pasangan | **Matriks kurs** + riwayat sparkline |

## 4. Detail per tab

### 4.1 Organization
- **Structure** — **outline menjorok** (`<ul>` bersarang), tiap baris: nama + badge tipe + **headcount** (`BulletBar`) + `AvatarStack` (user unit) + rentang efektif (`from→to`, `—` bila terbuka) + `StatusBadge`.
- **Timeline** — **pita waktu (Gantt-like)**: tiap unit satu pita pada sumbu waktu (`effectiveFrom→effectiveTo`, terbuka = melebar), garis "hari ini", **scrubber "as of"** yang menggeser garis & meredupkan unit yang belum/sudah berakhir.
- Kelola: buat (pemilih **parent**), edit (nama/tipe/parent/efektif), aktif-nonaktif (CAS).

### 4.2 Delegation of Authority
- **Tangga wewenang** — sumbu nominal **skala bersama** per jenis transaksi; tiap segmen = rentang aturan berlabel level approver; **tumpang tindih** digambar sebagai segmen bertumpuk + label teks ("overlaps …"); **celah** = zona kosong bertanda. Bukan tabel.
- **Analisis** — daftar tumpang tindih & celah ber-`StatusPill` severity + tautan ke aturan.
- **Simulator resolve** — masukkan nominal + konteks (transaksi/entity/BU/project/currency/risk) → **penanda posisi** di tangga + jawaban "Approver: Lx · role" + daftar aturan cocok.
- Kelola: buat/edit/aktif-nonaktif (CAS).

### 4.3 Currency & Exchange Rate
- **Matriks kurs** — baris = From, kolom = To, sel = kurs terbaru (intensitas warna **sekuensial** = besaran), `title` nilai penuh.
- **Riwayat per pasangan** — garis/sparkline tren kurs (`effectiveDate`); pemilih pasangan + jenis; titik terakhir + `DeltaBadge`.
- **Register mata uang** — kode/nama/symbol/decimals/status + aktif-nonaktif (CAS).
- **Revalue** — kalkulator konversi ber-konteks (amount, from, to, asOf) → hasil + rate terpakai.
- Kelola: buat mata uang, catat kurs (+`effectiveDate`).

## 5. Dasar pemilihan visual (bukan selera)

| Keputusan | Dasar |
|---|---|
| Hierarchy → tree/outline; waktu → pita/timeline | `ux-designer/18-data-viz` (*Hierarchy → tree*; *Trend over time*) |
| Ambang/rentang → pita berskala; tumpang tindih berlabel | Few (bar/segmented); *colour never alone* |
| Tren kurs → sparkline/line | data-viz (*Trend → line, sparkline*); Tufte |
| Matriks pasangan → heatmap sekuensial | data-viz (*Sequential palette*); bukan kategori |
| Bukan kartu/tabel polos | `no-slop-ui` (banned: metric-card grid, zebra); Tufte data-ink |
| Seleksi netral, satu aksen | prinsip `swiss-design` dengan token repo |
| Tab di URL | konvensi repo (`useUrlFilter('tab')` — 5 halaman lain) |
| Semua state + a11y | `design-standards`, `frontend-component-build`, WCAG 2.2 AA |

**Batas keras:** token repo saja (tanpa hex/font baru); tanpa gradien/glow/animasi entrance; bukan metric-card grid; kontras teks ≥4.5:1 & boundary ≥3:1; target ≥44px mobile (≥24px minimum); angka `font-mono tabular-nums`; elipsis `…`; `focus-visible:ring`; `motion-safe`.

## 6. Backend & kontrak

**Endpoint baru (aditif):**

| Method | Path | Fungsi |
|---|---|---|
| `PATCH` | `/organizations/:id` | Edit nama/tipe/parent/effectiveFrom/effectiveTo |
| `POST` | `/organizations/:id/status` | Aktif/nonaktif (CAS) |
| `PATCH` | `/doa-rules/:id` | Edit aturan |
| `POST` | `/doa-rules/:id/status` | Aktif/nonaktif (CAS) |
| `GET` | `/doa-rules/analysis` | Tumpang tindih & celah nominal per jenis transaksi |
| `POST` | `/doa/resolve` (diperluas) | Terima konteks penuh |
| `POST` | `/currencies/:id/status` | Aktif/nonaktif (CAS) |
| `GET` | `/exchange-rates/history` | Riwayat kurs per pasangan (sparkline) |

**Kontrak** (`packages/api-contracts/src/foundation-hardening.ts`): `organizationNodeSchema` (rekursif), `updateOrganizationSchema`, `updateDoaRuleSchema`, `doaAnalysisSchema`, `rateHistorySchema`, perluasan `resolveDoaInputSchema`. Semua aditif.

**Konvensi:** mutasi status = **CAS** (`updateMany` ber-guard) + **audit** (`AuditService`); transisi tak valid → 409 `INVALID_STATUS_TRANSITION`; error SCREAMING_SNAKE.

**Bug yang diperbaiki:** parsing tree org di FE (kontrak rekursif); hapus no-op `resolveDoaSchema.parse`.

## 7. Database (aditif)

- **enum `DoaRuleStatus`** (`ACTIVE | INACTIVE`) — konversi `String→enum` via `USING` cast (pola `LegalEntityStatus`).
- **index**: `Organization(legalEntityId, effectiveFrom, effectiveTo)`, `ExchangeRate(fromCurrencyId, toCurrencyId, effectiveDate)`, `DoaRule(transactionType, status)`.
- Tanpa tabel baru. Diverifikasi `prisma migrate reset`.

## 8. Primitif UI baru (aditif, `packages/ui`)

Hanya yang benar-benar belum ada:
- **`TimeBand`** — pita waktu untuk Timeline org (sumbu waktu + scrubber).
- **`SegmentRuler`** — pita berskala dengan segmen berlabel + penanda tumpang tindih/celah.
- **`RateMatrix`** — grid matriks kurs dengan warna sekuensial.

Semua token-only, aksesibel (`role="img"` + `aria-label` + padanan teks), tanpa gradien/glow.

## 9. Arsitektur kode

**BE** (`apps/api/src/modules/foundation`): `organization.service.ts` / `doa.service.ts` / `currency.service.ts` (+update/status/analysis/history), `presentation/controllers/foundation-hardening.controller.ts` (+routes), `presentation/dto/foundation-hardening.dto.ts` (+DTO), + 3 unit test.

**FE** (`apps/web/src/features/foundation-hardening`):
```
ui/  hardening-tabs.tsx · org-outline.tsx · org-timeline.tsx · org-form.tsx ·
     doa-ladder.tsx · doa-analysis.tsx · doa-form.tsx (resolve berkonteks) ·
     currency-register.tsx · rate-matrix.tsx · rate-history.tsx ·
     foundation-sections.tsx (dirombak)
pages/foundation/foundation-hardening.page.tsx (dirombak: 3 tab, URL)
model/foundation-hardening.api.ts (perbaiki tree + hook baru; buang useIfc/useReadiness)
```
Semua di atas primitive `@aec/ui` (SectionBand, BulletBar/Sparkline, StatusBadge, SegmentedControl, ConfirmActionButton, DataGrid, EmptyState/ErrorState) + 3 primitive baru.

## 10. Error handling

- BE: kode SCREAMING_SNAKE (`INVALID_STATUS_TRANSITION` baru; lain sudah ada).
- FE: setiap section menangani loading/error/empty sebelum render; aksi → toast + invalidate query.

## 11. Testing & gate

- **BE unit**: perilaku + CAS + audit (org/doa/currency); analisis tumpang tindih (batas: rentang `null` = ∞).
- **Kontrak**: parse (di suite API).
- **FE (Vitest)**: komponen baru + page 3 tab + a11y (tablist, keyboard, heading tanpa lompatan).
- **Gate**: `pnpm --filter @aec/api test:unit` · `pnpm --filter @aec/web test` · `pnpm lint` · `pnpm typecheck` (+ `prisma migrate reset`).

## 12. Pemecahan PR (1 requirement = 1 branch, base `develop`, merge commit)

| PR | Isi | Bergantung |
|---|---|---|
| 1 | **DB + kontrak + BE** (update/status/analysis/rate-history) + unit test | — |
| 2 | **FE Organization** (tab, outline, timeline+scrubber, form, parsing tree) | PR 1 |
| 3 | **FE DoA** (tangga wewenang, analisis, resolve berkonteks, kelola) | PR 1 |
| 4 | **FE Currency & Rate** (register, matriks, riwayat+sparkline, revalue) + bersih-bersih IFC/readiness | PR 1 |

## 13. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Enum `DoaRuleStatus` mengubah tipe `status` | grep semua pembaca `doaRule.status` + typecheck penuh |
| Perbaikan parsing tree mengungkap data org lama aneh | Tampilkan apa adanya + test bentuk kosong/nested |
| Analisis tumpang tindih salah pada rentang terbuka | Unit test batas: `amountTo=null` = ∞ |
| "Bukan kotak" jadi slop | Batas keras §5 + guard tanpa hex baru |
| Scope besar | Dipecah 4 PR; tiap PR menghasilkan software yang jalan |

## 14. Kriteria penerimaan

1. 3 tab, state di URL, seleksi netral; IFC/readiness tak ada lagi.
2. Organization tampil sebagai **outline benar** (bug #1 hilang) + Timeline+scrubber + kelola penuh.
3. DoA: tangga wewenang, tumpang tindih/celah terdeteksi, simulator resolve berkonteks, kelola penuh.
4. Currency: register + matriks kurs + riwayat sparkline + revalue, kelola penuh.
5. Setiap mutasi CAS + teraudit; setiap section punya loading/error/empty; a11y; gate hijau.

## 15. Referensi

- Skill: `ux-designer` (+ `18-data-visualization`), `design-standards`, `frontend-component-build`, `swiss-design`, `no-slop-ui`.
- `docs/architecture/CODEBASE-MAP.md`, `docs/quality/FINDINGS.md`.
- `apps/api/src/modules/foundation/*`, `apps/web/src/features/foundation-hardening/*`, `apps/api/prisma/schema.prisma`.

---

*Disusun dari analisis codebase pada branch `develop`.*
