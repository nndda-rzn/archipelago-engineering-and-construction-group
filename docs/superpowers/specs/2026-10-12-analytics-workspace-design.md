# `/analytics` Analytical Workspace — Design Spec

> Design spec. Status: **menunggu tinjauan pengguna**.
> Melanjutkan `2026-10-10-dashboard-control-tower-design.md` dan
> `2026-10-11-dashboard-enterprise-design.md` (Control Tower `/` sudah punya 10 domain tile + EVM nyata).
> Rencana tugas akan ditulis di `docs/superpowers/plans/2026-10-12-analytics-workspace.md`
> setelah spec ini disetujui.

---

## 1. Konteks

`/analytics` (Executive dashboard, `apps/web/src/pages/analytics/analytics-dashboard.page.tsx`)
kini 5 zona tipis dan **tumpang tindih** dengan dua surface lain:

| # | Temuan | Bukti |
|---|---|---|
| 1 | Anomaly triage **duplikat persis** dengan `/` | `analytics-dashboard.page.tsx:79-94` (`AnomalyTriageFilterable`) vs `widgets/anomaly-triage` di `/`; sumber data sama `useAnomalies()` |
| 2 | Tema net cash / budget / portfolio health berulang | baris ledger `dashboard-rows.ts:30,31` vs KPI + cash bridge di `/` |
| 3 | Champion "Cash position · bank balances" **menyesatkan** | `analytics-dashboard.page.tsx:47` merender `data.finance.cashIn` (arus masuk periode), bukan saldo bank |
| 4 | **Tanpa filter entity/periode** | `analytics-dashboard.page.tsx:13` memanggil `useExecutiveDashboard({})` — filter kosong hardcoded |
| 5 | Kedalaman lebih rendah dari `/` dan `/analytics/reporting` | `/` punya 6 KPI ber-target + SLA + 10 domain tile; `/analytics/reporting` punya aging detail + komposisi + forecast |

**Diagnosis:** `/analytics` lahir sebagai "dashboard eksekutif" paralel tanpa pembagian kerja,
sehingga menjadi **versi lebih tipis** dari `/`. Memperkaya kontennya tanpa membagi peran akan
**memperbesar** tumpang tindih, bukan menghilangkannya.

---

## 2. Tujuan & pembagian kerja

Tiap surface menjawab **pertanyaan yang berbeda**, bukan subset yang sama:

| Surface | Pertanyaan | Sifat |
|---|---|---|
| `/` Control Tower | "Sekarang — ada yang salah nggak?" | Snapshot, KPI ber-target, exception + SLA, live (SSE), exception-first |
| **`/analytics`** | **"Kenapa berubah, dan ke mana arahnya?"** | Time-series, perbandingan periode, dekomposisi, drill-down, ekspor — analitis/eksploratif |
| `/analytics/reporting` | "Dokumen" | Laporan siap cetak/ekspor |

**Tujuan spesifik:**

1. **De-overlap** — anomaly triage & champion saldo-bank pindah keluar dari `/analytics`.
2. **Beri kemampuan baru** — dekomposisi ("kenapa") & tren multi-metrik ("bagaimana") yang belum ada di mana pun.
3. **Scope yang bisa dibagikan** — filter entity + periode di URL (prasyarat surface analitis).
4. **Padat secara fungsional** — kepadatan informasi, bukan dekorasi.
5. **Jujur** — tak pernah menampilkan `Rp 0` sebagai data; setiap angka punya acuan.

## 3. Non-tujuan (di luar lingkup)

- Dark mode, dashboard per-peran, drag-and-drop/widget resize.
- Real-time/SSE (itu milik `/`).
- Mesin pivot generik (metrik × dimensi bebas) — YAGNI untuk sekarang.
- Mengubah `/` Control Tower dan `/analytics/reporting`.
- Menambah tabel/migrasi Prisma baru (skema sudah memadai — lihat §4).

---

## 4. Arsitektur informasi (5 zona)

Urutan vertikal = urutan prioritas (overview → zoom → detail, Shneiderman).

| Zona | Nama | Menjawab | Isi |
|---|---|---|---|
| 0 | **Scope bar** | "Untuk siapa & periode apa?" | Entity select + periode (MTD/QTD/YTD/12M/kustom) + toggle *compare vs previous* + ekspor. State di URL. |
| 1 | **Trend explorer** | "Bagaimana pergerakannya?" | Pemilih metrik → angka periode + Δ vs lalu + **line/area** dengan garis pembanding periode sebelumnya (putus-putus). |
| 2 | **What moved it** | "Kenapa berubah?" | **Dekomposisi kontribusi** metrik terpilih per dimensi (entity/proyek/tipe biaya/klien) — **diverging bar horizontal** + tabel + baris `others`. |
| 3 | **Rankings** | "Siapa kontributor terbesar?" | **Tabel padat** Top-N (proyek per variance/margin, klien per AR): nilai, Δ, share, sparkline, drill-through. |
| 4 | **Distributions** | "Bagaimana komposisinya?" | Grid **small-multiples**: komposisi biaya (stacked), aging AR/AP ringkas, konsentrasi AR, forecast-vs-actual. |

**Dihapus dari `/analytics`:**
- **Anomaly triage** → hidup penuh di `/` (Control Tower). Bukan dihapus dari produk.
- **Champion "Cash position · bank balances"** → diganti metrik **aliran periode** yang jujur
  (mis. "Cash collected · period"). Saldo bank tetap milik `/` (KPI `cash`).

**Skema DB:** tidak butuh tabel baru. `Project` sudah punya `legalEntityId`, `businessUnit`,
`status`, `contractValue`, `createdAt`; `BudgetItem` punya `costType`; `Collection`/`Payment`/
`ClientInvoice`/`VendorInvoice` punya tanggal. Dekomposisi & tren memakai kolom yang ada.

---

## 5. Kontrak data

### 5.1 Definisi metrik (seragam — satu sumber kebenaran)

| Metrik | Definisi | Field tanggal |
|---|---|---|
| `cashIn` | Σ `Collection` status POSTED | `collectedAt` |
| `cashOut` | Σ `Payment` status PAID | `paymentDate` |
| `netCash` | `cashIn − cashOut` | — |
| `cost` | Σ `VendorInvoice` status POSTED (`totalAmount`) | `invoiceDate` |
| `revenue` | Σ `ClientInvoice` status POSTED (`totalAmount`) | `invoiceDate` |
| `budget` | Σ `BudgetItem` status **PUBLISHED** (`amount`) | `createdAt` |
| `contractValue` | Σ `Project.contractValue` | `createdAt` |

> **Perbaikan konsistensi (temuan):** `cost-composition` & `project-cost-summary` saat ini memakai
> `BudgetItem` **tanpa** filter status, sedangkan `executive`/`control-tower` memakai `PUBLISHED`.
> Spec ini **menyeragamkan ke `PUBLISHED`** agar "budget" berarti sama di seluruh aplikasi.

### 5.2 Endpoint baru (aditif, read-only) — 2 buah

**1. `GET /analytics/trend-series`**

```
?metric=cashIn|cashOut|netCash|cost|revenue|budget|contractValue
&legalEntityId&from&to&compare=previous&bucket=month|quarter
```

Respons:

```ts
{
  metric: string;
  unit: string;                 // "idr" | ...
  bucket: 'month' | 'quarter';
  points: { period: string; value: number }[];
  comparePoints?: { period: string; value: number }[];  // ada bila compare=previous
  total: number;
  compareTotal?: number;
  delta?: { current: number; previous: number; pctChange: number | null; direction: 'up'|'down'|'flat' };
  generatedAt: string;
}
```

Menggantikan ketergantungan pada tren 6-bulan hardcoded (`executive.trend`); mendukung metrik apa
pun + overlay periode pembanding.

**2. `GET /analytics/decomposition`**

```
?metric=&dimension=entity|project|costType|client
&legalEntityId&from&to&compare=previous&limit=10
```

Respons:

```ts
{
  metric: string;
  dimension: string;
  items: { key: string; label: string; value: number; share: number; previousValue?: number; delta?: {...} }[];
  total: number;
  previousTotal?: number;
  others: { value: number; previousValue?: number };  // sisa di luar Top-N → total tetap rekonsiliasi
  generatedAt: string;
}
```

### 5.3 Matriks metrik × dimensi

Kombinasi yang didukung (selain ini → **400 `UNSUPPORTED_DECOMPOSITION`**, bukan diam-diam kosong):

| Metrik | entity | project | costType | client |
|---|---|---|---|---|
| cashIn / cashOut / netCash | ✅ | ✅ | — | ✅ |
| revenue / cost | ✅ | ✅ | — | ✅ |
| budget | ✅ | ✅ | ✅ | — |
| contractValue | ✅ | ✅ | — | ✅ |

### 5.4 Dipakai ulang (tanpa endpoint baru)

`executive` (+delta), `cash-flow`, `aging`, `ar-concentration`, `cost-composition`,
`project-cost-summary`, `forecast-vs-actual`.

### 5.5 Aturan umum

- **Aditif**: tanpa param → perilaku endpoint lama tidak berubah.
- Validasi tanggal: `from ≤ to` (400 `INVALID_DATE_RANGE`), rentang maks 5 tahun (400 `DATE_RANGE_TOO_WIDE`) — helper sudah ada.
- Cache key: `${key}:${legalEntityId ?? 'all'}:${from ?? ''}:${to ?? ''}:${metric}:${dimension}`.
- Semua blok selalu terisi (array/objek kosong, bukan `null`).

---

## 6. UX, visual, aksesibilitas

### 6.1 Pemilihan visual dari FUNGSI data (bukan selera)

Aturan: `ux-designer/18-data-visualization` §Chart Selection.

| Zona | Hubungan data | Visual | Alasan |
|---|---|---|---|
| 1 Trend explorer | Tren waktu | Line/area + garis pembanding putus-putus | "Trend over time → line/area; hindari pie" |
| 2 What moved it | Kontribusi/selisih (ada titik tengah 0) | Diverging bar horizontal + label nilai | "Diverging → data dengan midpoint bermakna"; horizontal mudah dilabeli |
| 3 Rankings | Peringkat | Bar horizontal terurut + tabel | "Ranking → horizontal bar (sorted)" |
| 4 Distributions | Bagian-dari-keseluruhan | Stacked bar | "Part of whole → stacked bar"; hindari pie >6 slice |

### 6.2 Kepadatan = fitur (bukan dekorasi)

"Ramai" yang dimaksud = **padat data**, bukan padat hiasan. Teknik:

| Teknik | Fungsi |
|---|---|
| Small multiples (grid mini-chart) | Bandingkan banyak tren, skala seragam |
| Sparkline inline di baris/kolom tabel | Tren tanpa pindah halaman |
| Overlay pembanding / target | Konteks, bukan angka telanjang |
| Tabel padat multi-kolom (nilai, Δ, share, spark, drill) | Overview → detail satu layar |
| Micro-chart (bullet, diverging, heatmap, stacked) | Encoder tepat per hubungan data |
| Dekomposisi berlapis (Σ → per dimensi → others) | Menjawab "kenapa" berjenjang |
| Kontras kepadatan antar-zona (Zona 1 lapang, 3–4 padat) | Hierarki dari kepadatan, bukan warna |

### 6.3 Batas keras (anti-slop — mengikat)

- **Token-only**: warna/radius/font dari design system repo (`chart-colors.ts`, tailwind preset).
  **Tidak** menulis hex baru; **tidak** ganti font/tema.
- **Dilarang**: gradien dekoratif, glow, animasi entrance, scale-on-hover, metric-card grid sebagai
  tulang punggung halaman, eyebrow uppercase berlebihan, pil dekoratif.
- **Motion** ≤ `duration-fast` (150ms); hormati `prefers-reduced-motion`.
- **Warna tak pernah sendiri**: setiap visual punya nilai teks pendamping + `role="img"` + `aria-label`.
- **Sumbu Y tidak dipotong** (mulai dari 0 kecuali data diverging); **tanpa dual y-axis**.
- **Legend wajib** bila >1 seri.
- Padding konsisten 24–32px.

### 6.4 Keadaan data (wajib untuk SETIAP zona)

- **Loading** → skeleton bergeometri **sama** dengan konten (cegah CLS).
- **Error** → `role="alert"` + tombol Retry; **tidak pernah** menampilkan `Rp 0` sebagai data.
- **Empty** → pesan edukatif + saran ("coba ubah rentang/filter"), bukan kotak kosong.
- **Stale** → indikator "diperbarui X lalu" (bukan auto-refresh tanpa peringatan).

### 6.5 Interaksi

- **Drill-through** fokusabel keyboard (Enter/Space), bukan mouse-only:
  proyek → `/project-health?project={id}`; klien → `/finance/client-invoices`.
- **Cross-filter**: memilih dimensi di Zona 2 menyaring Zona 3–4.
- **Filter bar persisten** + chip filter aktif (bisa dihapus) + Reset.
- **Tooltip** menampilkan nilai + periode pembanding, tidak menutupi titik data.

### 6.6 Responsif

- `≥1280px`: grid 12 kolom.
- `768–1279px`: dua kolom.
- `<768px`: satu kolom (KPI dulu, chart bisa di-expand).
- Skeleton & konten berbagi geometri.

### 6.7 Aksesibilitas

- Padanan tabel teks untuk setiap chart (dapat dibaca tanpa warna).
- `aria-sort` pada header tabel yang dapat diurutkan.
- Kontras data ≥ 3:1; target klik ≥ 24×24 CSS px.
- Satu `<h1>`; hierarki heading tanpa lompatan.

---

## 7. Arsitektur kode

### 7.1 Backend (`apps/api/src/modules/analytics`)

```
application/services/
  trend-series.service.ts     BARU — seri waktu multi-metrik + overlay pembanding
  decomposition.service.ts    BARU — kontribusi per dimensi + others
  shared/metric-registry.ts   BARU — SUMBER TUNGGAL definisi metrik
```

`metric-registry.ts` memetakan `metric → { label, unit, dateField, aggregate(), allowedDimensions }`.
`trend-series` & `decomposition` membaca dari peta yang sama; `UNSUPPORTED_DECOMPOSITION` dihasilkan
dari sini. **Tidak ada dua definisi metrik** di seluruh service.

Endpoint ditambah ke `presentation/controllers/analytics.controller.ts` yang sudah ada (2 route baru).
`analytics.module.ts` mendaftarkan 2 service baru.

### 7.2 Kontrak (`packages/api-contracts/src/analytics.ts`)

Tambah `trendSeriesSchema`, `decompositionSchema` (Zod) + tipe turunannya. Aditif — tipe lama tetap.

### 7.3 Frontend (`apps/web/src/features/analytics`)

```
model/analytics.api.ts        + useTrendSeries, useDecomposition (pola query yang ada)
ui/
  scope-bar.tsx               BARU — Zona 0
  trend-explorer.tsx          BARU — Zona 1
  decomposition-bars.tsx      BARU — Zona 2
  rankings-table.tsx          BARU — Zona 3
  distributions.tsx           BARU — Zona 4
pages/analytics/analytics-dashboard.page.tsx   dirombak jadi 5 zona; anomaly triage dihapus
```

Dibangun di atas primitive `@aec/ui` (DataGrid, Sparkline, SegmentedControl, StatTile, dst.) dan
pola `widgets/dashboard-charts` (recharts). **Tidak** menambah widget duplikat.

**State URL**: `?entity=&period=&from=&to=&compare=&metric=&dimension=` via `useUrlFilter` yang ada.

### 7.4 Isolasi & tanggung jawab unit

| Unit | Tujuan | Dependensi |
|---|---|---|
| `metric-registry` | Definisi metrik tunggal | PrismaService |
| `trend-series.service` | Seri waktu + pembanding | metric-registry, PrismaService, CacheService |
| `decomposition.service` | Kontribusi per dimensi | metric-registry, PrismaService, CacheService |
| `scope-bar` | Filter scope (URL) | useUrlFilter, EntitySelect |
| `trend-explorer` | Tren + pembanding | useTrendSeries, chart |
| `decomposition-bars` | Kontribusi "kenapa" | useDecomposition |
| `rankings-table` | Top-N + drill | useDecomposition, DataGrid |
| `distributions` | Small-multiples | hook yang sudah ada |

---

## 8. Error handling

- BE: kode SCREAMING_SNAKE; `UNSUPPORTED_DECOMPOSITION` (400), `INVALID_DATE_RANGE` /
  `DATE_RANGE_TOO_WIDE` (400, sudah ada). Respons `{ error: { code, message, details, correlationId } }`.
- FE: setiap zona menangani loading/error/empty/stale **sebelum** memformat angka; `role="alert"` +
  retry; tak pernah `Rp 0` palsu.

---

## 9. Testing & gate

**API unit (`*.spec.ts`):**
- `metric-registry` — peta lengkap; kombinasi tak didukung ditolak.
- `trend-series` — bulan kosong = 0; overlay pembanding; delta benar.
- `decomposition` — **rekonsiliasi Σitems + others = total**; kombinasi tak didukung → error.

**Web (Vitest, `*.test.tsx`):**
- Tiap komponen baru (`scope-bar`, `trend-explorer`, `decomposition-bars`, `rankings-table`,
  `distributions`) + fungsi murni.
- Uji a11y: padanan tabel teks; keyboard drill-through (Enter/Space).
- Uji page: merender 5 zona; anomaly triage **tidak** ada.

**Gate (harus hijau):**
`pnpm --filter @aec/api test:unit` · `pnpm --filter @aec/web test` · `pnpm lint` · `pnpm typecheck`.

---

## 10. Pemecahan PR (1 requirement = 1 branch, base `develop`, merge commit, no squash)

| PR | Isi | Bergantung pada |
|---|---|---|
| 1 | **BE**: `metric-registry` + `trend-series` + `decomposition` + kontrak + unit test | — |
| 2 | **FE**: `scope-bar` + `trend-explorer` (Zona 0–1) + hooks | PR 1 |
| 3 | **FE**: `decomposition-bars` + `rankings-table` + `distributions` (Zona 2–4) | PR 1 |
| 4 | **FE**: rombak `analytics-dashboard.page.tsx`, hapus anomaly triage dari sini, test page + a11y | PR 2, 3 |

PR 1 (BE) dan penyiapan FE dapat berjalan berurutan; PR 2 & 3 dapat paralel setelah PR 1.

---

## 11. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| `cost` = VendorInvoice (bukan jurnal GL) disalahpahami | Label eksplisit "actual cost (posted vendor invoices)" |
| `others` di dekomposisi bikin total tak rekonsiliasi | Unit test Σitems + others = total |
| Kombinasi metrik×dimensi tak didukung diam-diam kosong | 400 `UNSUPPORTED_DECOMPOSITION` eksplisit |
| "Ramai" jadi slop | Batas keras §6.3 + guard test tanpa hex baru |
| Menyeragamkan `budget` ke `PUBLISHED` mengubah angka lama | Dicatat sebagai perbaikan; angka `DRAFT` memang belum baseline |
| Tumpang tindih kembali muncul | Anomaly triage & champion saldo-bank dihapus dari `/analytics` |

---

## 12. Kriteria penerimaan

1. `/analytics` **tidak** lagi menampilkan anomaly triage maupun champion "bank balances".
2. Filter entity + periode ada, tersimpan di URL, dapat dibagikan.
3. Trend explorer menampilkan seri + overlay pembanding untuk metrik terpilih.
4. Dekomposisi merekonsiliasi: Σ Top-N + `others` = total.
5. Setiap zona punya keadaan loading/error/empty/stale; tidak pernah `Rp 0` palsu.
6. Setiap chart punya padanan teks + `aria-label`; drill-through dapat dioperasikan keyboard.
7. Visual dipilih dari fungsi data; patuh token & anti-slop.
8. Gate §9 hijau.

---

## 13. Referensi

- `docs/superpowers/specs/2026-10-10-dashboard-control-tower-design.md`
- `docs/superpowers/specs/2026-10-11-dashboard-enterprise-design.md`
- `docs/quality/DASHBOARD-UIUX-AUDIT.md`
- `docs/architecture/CODEBASE-MAP.md`
- `apps/api/src/modules/analytics/application/services/*` (executive, financial, project)
- Skill: `ux-designer/18-data-visualization`, `no-slop-ui`, `frontend-design`

---

*Disusun dari analisis codebase pada branch `develop`.*
