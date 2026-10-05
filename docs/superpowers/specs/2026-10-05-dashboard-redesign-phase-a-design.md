# Dashboard Redesign — Phase A (Functional Foundation)

> Design spec. Status: **draft for review**. Scope: landing dashboard (`/`) only.
> Bagian dari program multi-fase A→B→C→D (lihat §1.4).

---

## 1. Konteks & tujuan

### 1.1 Masalah
Dashboard landing (`apps/web/src/pages/dashboard.page.tsx`) saat ini hanya deretan KPI
(contract/budget/actual/revenue), satu donut health, dan satu tabel portofolio. Ia
menampilkan **angka**, bukan **keputusan**: tidak ada sinyal apa yang perlu ditindak,
tidak bisa difilter, tidak bisa ditelusuri (drill-down), dan tidak memakai kapabilitas
analitik yang sudah ada di backend (cash flow, aging, cost summary, anomali).

### 1.2 Hasil yang diinginkan
`/` menjadi **command center harian**: dalam 5 detik seorang manajer tahu apa yang
butuh perhatian, posisi kas, dan proyek mana yang menyimpang — lalu bisa mengklik
untuk menelusuri penyebabnya.

### 1.3 Prinsip
- **Design system-first.** Tidak ada warna/font/radius baru. Improvisasi ada pada
  *komposisi, hierarki informasi, bentuk visualisasi, densitas, dan gerak*.
- **Aditif di backend.** Tanpa query param, endpoint berperilaku identik dengan
  sekarang → `/analytics`, `/analytics/reporting`, dan 52 halaman lain tidak berubah.
- **Bisa ditelusuri.** Setiap angka yang bermakna punya tujuan drill-down yang
  benar-benar menyaring daftar tujuan.

### 1.4 Program multi-fase
| Fase | Isi | Spec |
|---|---|---|
| **A** | Fondasi fungsional (dokumen ini) | ini |
| B | Kecerdasan finansial: EVM rollup (CPI/SPI/EAC/VAC), cash position + runway, working-capital gap | menyusul |
| C | Interaksi & prioritas: urgensi/SLA inbox, cross-filter linked views, delta periode (MoM/YoY), triage anomali | menyusul |
| D | Produktivitas: saved views, command palette ⌘K, keyboard-first, ekspor view terfilter | menyusul |

Fase A sengaja tidak menampilkan EVM/delta/⌘K. Arah visual (arah "Campuran 1+3+2":
kerangka Control Room, portofolio Relational Canvas, hero Editorial) sudah final dan
dipakai konsisten lintas fase.

---

## 2. Ruang lingkup

### 2.1 Termasuk
- Komposisi ulang `dashboard.page.tsx` menjadi 5 zona (Zona 0–4).
- Widget baru di `apps/web/src/widgets/`.
- Primitif baru di `packages/ui` + satu token tipografi `display`.
- Filter global (periode + legal entity) di URL.
- Panel "perlu tindakan" (Signal Rail) berbasis jumlah.
- Chart finansial di landing (cash flow, aging, budget burn).
- Portofolio dua mode: Canvas (scatter) + Tabel (spine).
- Drill-through dasar.
- Backend aditif: filter opsional + endpoint `pending-count`.

### 2.2 Tidak termasuk (fase lain)
- EVM/CPI/SPI/EAC/VAC, cash runway, working-capital gap (Fase B).
- SLA/umur dokumen, cross-filter linked views, delta periode, triage (Fase C).
- Saved views, ⌘K, keyboard-first, ekspor view (Fase D).
- Perubahan pada halaman selain `/` (kecuali penambahan dukungan query param pada
  halaman tujuan drill-down bila belum ada — lihat §6.4).

### 2.3 Non-tujuan
- Mengganti design system atau menambah tema.
- Mengubah auth/permission.
- Menyentuh 52 halaman lain.

---

## 3. Arsitektur informasi (Zona)

```
Zona 0  Context bar (sticky)     judul editorial + FilterBar + Reload + LastUpdated
Zona 1  Signal Rail              chip "perlu tindakan", urut severity, deep-link
Zona 2  Hero Band (editorial)    Net Cash Position + narasi + 3 stat (Contract/Budget/Actual)
Zona 3  Financial Band           cash flow + aging AR/AP + budget burn
Zona 4  Portfolio Zone           toggle [Canvas | Tabel]
```

Urutan vertikal di atas adalah urutan prioritas: sinyal lebih dulu, lalu konteks
angka, lalu detail.

### 3.1 Zona 0 — Context bar
- Kiri: judul halaman + subjudul editorial (mis. "Portfolio command center") +
  `generatedAt` relatif.
- Kanan: **FilterBar**
  - **SegmentedControl** periode: `MTD · QTD · YTD · 12M · Custom`.
    - `MTD`/`QTD`/`YTD`/`12M` → dihitung menjadi `from`/`to` di klien.
    - `Custom` → dua input tanggal (`from`, `to`).
  - **EntitySelect** legal entity (opsi "All entities" = tanpa filter).
  - `Button` Reload + `LastUpdated`.
- State filter disimpan di URL via `useUrlFilter` (dapat dibagikan/di-bookmark).
- `sticky top-0 z-sticky`, latar `bg-white`, `border-b border-neutral-200`.

### 3.2 Zona 1 — Signal Rail
Strip chip horizontal (wrap di layar sempit; scroll-x di mobile). Setiap chip:
dot severity + angka mono besar + label + konteks + deep-link.

Sumber sinyal dan tujuan:

| Sinyal | Sumber data | Tujuan deep-link |
|---|---|---|
| Anomali (HIGH/MEDIUM/LOW) | `useAnomalies()` | `/analytics` |
| NCR terbuka | `executive.operational.openNcrs` | `/quality?tab=ncrs` |
| Insiden terbuka | `executive.operational.openIncidents` | `/hse?tab=incidents` |
| PM jatuh tempo | `executive.operational.overduePm` | `/hcm/equipment` |
| Punch item terbuka | `executive.operational.openPunchItems` | `/quality?tab=punch` |
| Progress claim DRAFT | `executive.operational.openClaims` | `/finance/progress-claims` |
| Approval menunggu | `GET /approvals/pending-count` (baru) | `/approvals` |
| AR lewat jatuh tempo | `aging.ar` bucket `61-90` + `90+` | `/finance/client-invoices` |

- Urutan: severity menurun (HIGH → LOW), lalu jumlah menurun.
- Chip dengan jumlah 0 disembunyikan.
- Bila **semua** nol → tampilkan `EmptyState` tenang ("All clear — no open signals").
- Severity menentukan warna dot/badge dari token `destructive`/`warning`/`info`.

### 3.3 Zona 2 — Hero Band (editorial)
- **Hero figure:** `Net Cash Position` = `executive.finance.cashIn − cashOut`.
  - Overline label, angka `text-display` (token baru), `font-mono tabular-nums`.
  - Warna angka: `financial-positive-600` bila ≥ 0, `financial-negative-600` bila < 0.
- **Narasi** (satu kalimat, fungsi murni): mis. "Cash net positive Rp X; N critical
  projects; M open NCRs." Dibangun dari data yang sudah dimuat — tanpa panggilan API.
- **3 StatCard** editorial: Contract Value, Budget (label diberi "(baseline)"),
  Actual Cost (+ baris konteks mis. "82% of budget").
- Whitespace lega; pemisah garis tipis `border-neutral-200`.

### 3.4 Zona 3 — Financial Band
- **Cash Flow**: bar chart (recharts) dari `useCashFlow(filter)`; di-restyle ke token
  (warna `success-500`/`destructive-500`, grid `neutral-200`, tick `neutral-500`).
- **Aging AR/AP**: satu batang tersegmentasi per sisi (AR dan AP), segmen = bucket
  `CURRENT · 1-30 · 31-60 · 61-90 · 90+`, warna dari ramp token; label total.
- **Budget burn**: bar proporsi `totalActual / totalBudget` (dari portfolio totals).
- Setiap blok: judul `text-h2`, konten, tautan "View details" bila relevan.

### 3.5 Zona 4 — Portfolio Zone
Toggle `[Canvas | Tabel]` (SegmentedControl, state di URL `view`).

**Mode Canvas (Relational)**
- recharts `ScatterChart`.
- **Sumber data gabungan:** titik dibentuk dengan menggabungkan
  `usePortfolio(filter)` (health, contractValue, budget, actual, projectId) dan
  `useProjectCostSummary()` (margin, budgetUsagePct) **di-join dengan `projectCode`**.
  Proyek yang tidak ada di cost summary tetap tampil dengan `margin = 0`.
  (Fase B akan menyatukan keduanya di satu endpoint rollup.)
  Catatan Fase A: `project-cost-summary` **belum** menerima filter entity/periode, jadi
  margin tetap snapshot; hanya posisi/health yang mengikuti filter. Ini diterima
  sebagai keterbatasan sementara dan diselesaikan di Fase B.
- Sumbu X = `budget usage %` = `budget > 0 ? actual / budget × 100 : 0`.
- Sumbu Y = `margin %` = `revenue > 0 ? (revenue − cost) / revenue × 100 : 0`
  (bila `revenue = 0`, titik diletakkan di 0 dan tooltip menandai "no revenue").
- Ukuran titik = nilai kontrak (radius berskala, dengan batas min/max).
- Warna titik = health (`project-on-track/at-risk/critical`, `NO_BUDGET` = `neutral-400`).
- Garis kuadran via `ReferenceLine`: X = 100%, Y = 0%.
- Tooltip: kode+nama proyek, margin %, usage %, kontrak, health.
- Klik titik → `/project-health?project={id}`.
- Legenda health (dapat diklik pada Fase C untuk cross-filter; di Fase A hanya legenda).
- **Aksesibilitas:** canvas selalu disertai toggle ke Tabel sebagai fallback setara.

**Mode Tabel (portfolio spine)**
Kolom: Project (code+name), Client, Health (dot + label), Utilization (BulletBar),
Budget vs Actual (MiniStackedBar), Variance (berwarna), Revenue, Margin chip.
- Sortable; klik baris → `/project-health?project={id}`.
- Menggunakan `DataGrid` yang ada agar konsisten.

### 3.6 Responsif
- `≥1280px (xl)`: Hero (7/12) ‖ Financial (5/12); Canvas & Tabel penuh.
- `768–1279px (md)`: Hero penuh → Financial penuh → Portfolio.
- `<768px (sm)`: urutan Context → Signal (scroll-x) → Hero → Financial → Portfolio;
  default view = **Tabel** (canvas terlalu sempit), canvas tetap dapat dipilih.

---

## 4. Design system

### 4.1 Token baru (satu saja)
`packages/config/tailwind/tailwind.preset.cjs`:
```js
fontSize: {
  // ...yang ada
  display: ['2.5rem', { lineHeight: '1.1', fontWeight: '600' }],
}
```
Dipakai hanya untuk angka hero.

### 4.2 Primitif/komponen baru di `packages/ui`
| Komponen | Ringkasan | A11y |
|---|---|---|
| `StatCard` | overline + nilai + baris konteks + delta opsional | teks semantik; nilai `tabular-nums` |
| `SegmentedControl` | pilihan tunggal bergaya segmented | `role="radiogroup"` + tiap opsi `role="radio"` + `aria-checked`; navigasi panah kiri/kanan |
| `SignalChip` | chip sinyal dengan dot severity + count + label + link | `<a>` nyata; `aria-label` deskriptif |
| `DataBar` | `BulletBar` (satu nilai vs max), `MiniStackedBar` (dua segmen), `Sparkline` (opsional) | nilai juga tersedia sebagai teks tersembunyi (`sr-only`) |

Semua diekspor lewat `packages/ui/src/index.ts`.

### 4.3 Komponen yang dipensiunkan
- `widgets/dashboard-grid/` (DashboardGrid, KpiCard, HealthCount) — digantikan
  Hero Band + Financial Band + StatCard.
- `widgets/dashboard-charts/` `HealthDonut` — health kini tampil sebagai legenda
  Canvas + ringkasan di Signal Rail.
- `CashFlowChart` **dipertahankan** (di-restyle) dan dipakai di Financial Band.

### 4.4 Aturan pakai token
- Warna: `racing-red-600` (aksen aktif/toggle), `neutral-50..950`, semantik
  `success/warning/destructive/info`, `project-*`, `financial-positive/negative`.
- Tipografi: `overline` (label), `display` (hero), `h1/h2/h3`, `body/body-sm`,
  `caption`; semua angka `font-mono tabular-nums`.
- Radius `rounded-md` (6px) / `rounded-lg` (8px untuk band), elevasi `shadow-xs`.
- Gerak `duration-fast` (150ms), `animation slide-up` (token ada).

---

## 5. Data & kontrak

### 5.1 Query param baru (semua opsional)
| Endpoint | Param | Efek |
|---|---|---|
| `GET /projects/portfolio` | `legalEntityId?` | filter `Project.legalEntityId` |
| `GET /analytics/executive` | `legalEntityId?`, `from?`, `to?` | scope proyek + agregat berbasis tanggal |
| `GET /analytics/cash-flow` | `legalEntityId?`, `from?`, `to?` | irisan seri bulanan |
| `GET /analytics/aging` | `legalEntityId?` | filter bucket (snapshot) |
| `GET /approvals/pending-count` (baru) | — | jumlah approval menunggu |

Aturan:
- Tanpa param → perilaku identik sekarang.
- Tanggal `from`/`to` format ISO date (YYYY-MM-DD).
- **Budget** tidak difilter periode (hanya `createdAt`, baseline) → label "(baseline)".
- Aging tidak difilter periode (snapshot posisi saat ini) → hanya `legalEntityId`.

### 5.2 Validasi
- `from ≤ to`; jika tidak → `400 INVALID_DATE_RANGE`.
- Rentang maksimum 5 tahun; jika lebih → `400 DATE_RANGE_TOO_WIDE`.

### 5.3 Cache
Key analytics menjadi `${key}:${legalEntityId ?? 'all'}:${from ?? ''}:${to ?? ''}`
(TTL tidak berubah). `invalidateAnalytics()` tetap menghapus seluruh key prefix.

### 5.4 Kontrak Zod (`packages/api-contracts`)
- Tambah skema query param opsional untuk analytics + project portfolio.
- Tambah tipe respons `pending-count`.
- Tipe respons yang ada tidak berubah bentuk.

### 5.5 Hook web
- `usePortfolio(filter?)`, `useExecutiveDashboard(filter?)`, `useCashFlow(filter?)`,
  `useAging(filter?)` menerima objek filter dan menyertakannya di `queryKey`.
- Tambah `usePendingApprovals()`.
- `filter` diambil dari URL (Zona 0).

---

## 6. Interaksi

### 6.1 Filter global
Mengubah periode/entity → semua hook (portfolio, executive, cash-flow, aging)
refetch dengan filter baru; `queryKey` berubah sehingga cache terpisah.

### 6.2 Drill-through (dasar)
| Pemicu | Tujuan |
|---|---|
| Chip Signal Rail | halaman daftar terkait dengan query param yang menyaring |
| Titik Canvas | `/project-health?project={id}` |
| Baris Tabel | `/project-health?project={id}` |
| StatCard "Actual Cost" | `/finance/trial-balance` |
| StatCard "Contract" | `/projects` |

### 6.3 Toggle Canvas/Tabel
Disimpan di URL (`view=canvas|tabel`); default `canvas` di `xl`, `tabel` di `<768px`.

### 6.4 Dukungan halaman tujuan
Halaman tujuan drill-down harus menghormati query param:
- `/quality` → `tab` (sudah ada via `useUrlFilter`); pastikan `tab=ncrs`/`tab=punch`.
- `/hse` → `tab` (sudah ada); pastikan `tab=incidents`.
- `/finance/progress-claims` → `claimType` (sudah ada); status DRAFT via param bila
  belum ada → tambahkan filter `status` bila diperlukan.
- `/approvals` → sudah punya daftar.
- `/project-health` → tambahkan dukungan `?project={id}` bila belum ada.

Jika sebuah halaman belum mendukung param yang dibutuhkan, penambahan bersifat
minimal (membaca param → mengisi filter lokal).

---

## 7. Motion & aksesibilitas

### 7.1 Motion
- Satu orkestrasi reveal berjenjang saat load: zona 1→4, `animation slide-up`,
  stagger 40ms (`animation-delay`).
- `prefers-reduced-motion: reduce` → semua animasi reveal dinonaktifkan.
- Transisi data chart lembut (durasi default recharts).

### 7.2 Aksesibilitas
- Canvas punya padanan Tabel (toggle) — tidak ada informasi yang hanya tersedia
  lewat warna/posisi.
- Health selalu ditampilkan sebagai dot **dan** label teks.
- Kontras teks mengikuti perbaikan sebelumnya (`neutral-500` minimum di surface putih).
- `SegmentedControl` dan `SignalChip` dapat dioperasikan keyboard.
- Angka memakai `tabular-nums` agar kolom stabil.
- Setiap chip/titik/baris punya `aria-label` deskriptif.

---

## 8. Pengujian

### 8.1 Unit (web)
- Fungsi murni periode → `from`/`to` (MTD/QTD/YTD/12M).
- Fungsi murni narasi hero (data → kalimat).
- Pemetaan sinyal → deep-link (termasuk urutan severity & sembunyikan nol).
- Guard rentang tanggal di klien (bila ada validasi sisi klien).

### 8.2 Komponen (RTL)
- Render tiap zona dengan data mock.
- A11y: peran/aria `SegmentedControl` (radiogroup), `SignalChip`, toggle Canvas/Tabel.
- `prefers-reduced-motion` menonaktifkan reveal.
- Empty state Signal Rail ("All clear").

### 8.3 API
- Unit service: filter `legalEntityId`/`from`/`to` menghasilkan where-clause benar.
- Unit: validasi rentang tanggal (400).
- E2E ringan: endpoint tanpa param menghasilkan bentuk yang sama seperti sebelumnya.

### 8.4 Verifikasi manual
- `pnpm typecheck` + `pnpm lint` hijau.
- `pnpm --filter @aec/api test:unit` + `pnpm --filter @aec/web test` hijau.
- Cek di app yang berjalan: filter mengubah angka; drill-down menyaring; toggle bekerja.

---

## 9. File yang disentuh

### 9.1 Baru (`apps/web/src/widgets/`)
`dashboard-filter-bar/`, `signal-rail/`, `hero-band/`, `financial-band/`,
`portfolio-canvas/`, `portfolio-spine/`.

### 9.2 Baru (`packages/ui`)
`primitives/stat-card.tsx`, `primitives/segmented-control.tsx`,
`primitives/signal-chip.tsx`, `primitives/data-bar.tsx`.

### 9.3 Diubah
- `apps/web/src/pages/dashboard.page.tsx` (ditulis ulang).
- `apps/web/src/widgets/dashboard-charts/charts.tsx` (restyle + AgingBar).
- `apps/web/src/features/analytics/model/analytics.api.ts` (filter + pending).
- `apps/web/src/features/project/model/project.api.ts` (`usePortfolio(filter)`).
- `packages/ui/src/index.ts` (ekspor).
- `packages/config/tailwind/tailwind.preset.cjs` (+`display`).
- `packages/api-contracts/src/analytics.ts`, `project.ts` (param + tipe baru).
- API: `analytics.controller.ts`, `analytics.service.ts`, `project.controller.ts`,
  `portfolio.service.ts`, `approval` (endpoint `pending-count`).

### 9.4 Dipensiunkan
`apps/web/src/widgets/dashboard-grid/`.

---

## 10. Kriteria penerimaan

1. `/` menampilkan Zona 0–4 dengan data nyata dari API.
2. Filter periode + entity mengubah angka di seluruh zona; state ada di URL.
3. Signal Rail menampilkan sinyal terbuka dan deep-link benar-benar menyaring
   daftar tujuan; bila kosong menampilkan state "All clear".
4. Hero menampilkan Net Cash Position + narasi + 3 stat.
5. Financial Band menampilkan cash flow, aging AR/AP, dan budget burn.
6. Portfolio punya Canvas (scatter) dan Tabel (spine), dapat ditukar, dan Canvas
   punya padanan tabel (a11y).
7. Drill-through bekerja untuk chip, titik, dan baris.
8. Tanpa query param, endpoint API berperilaku identik dengan sebelumnya.
9. `pnpm typecheck`, `pnpm lint`, unit API, dan test web hijau.
10. Reveal berjenjang dinonaktifkan pada `prefers-reduced-motion`.

---

## 11. Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|
| Menyentuh kontrak API dipakai halaman lain | Semua param opsional; uji "tanpa param = hasil lama"; cache key di-prefix |
| Canvas tidak aksesibel | Toggle Tabel sebagai padanan setara; health selalu dot+label |
| Densitas berlebih di mobile | Urutan zona responsif + Signal Rail scroll-x |
| Budget tak bermakna bila difilter periode | Label "(baseline)"; aging & budget tidak difilter periode |
| Data cost summary belum ada untuk sebagian proyek | Canvas menangani `null`/0 dengan aman (titik di sumbu 0 + tooltip "no data") |
