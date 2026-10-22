# AEC ERP — Overview Project & Halaman Dashboard

> **Archipelago Engineering & Construction Group — Enterprise Construction & EPC ERP Platform**
> Dokumen tunggal: informasi umum project + detail lengkap halaman Dashboard (`/`).
> Disusun dari analisis codebase pada branch `feat/dashboard-polish`.

---

## Daftar Isi

1. [Informasi Umum Project](#1-informasi-umum-project)
2. [Halaman Dashboard (`/`)](#2-halaman-dashboard-)
3. [Riwayat Redesign Dashboard](#3-riwayat-redesign-dashboard)
4. [Referensi](#4-referensi)

---

## 1. Informasi Umum Project

### 1.1 Ringkasan

**AEC ERP** adalah platform ERP untuk perusahaan konstruksi/EPC skala besar:

- **Multi-company, multi-project, multi-region, multi-currency, multi-business-unit**
- **Project-centric**: satu proyek mengikat budget, procurement, inventory, biaya (GL), progress claim, sampai serah terima
- **Monorepo**: pnpm workspace + Turborepo · Node ≥ 20 · pnpm 10.33.3

### 1.2 Struktur Monorepo

```text
apps/
  api/        NestJS modular monolith (17 domain) + Prisma + BullMQ worker
  web/        React SPA (Feature-Sliced Design)
packages/
  api-contracts/  Skema Zod + tipe request/response per domain (kontrak FE↔BE)
  shared-types/   Enum/tipe transversal (TransactionStatus, dll)
  validation/     Skema validasi bersama
  ui/             Design system (primitives + enterprise components)
  config/         Preset tsconfig / eslint / prettier / tailwind
infrastructure/
  docker/     compose.dev.yml, compose.prod.yml, nginx
  database/   slot migrasi/seed tingkat infra (dipakai Prisma di apps/api)
docs/
  architecture/    CODEBASE-MAP.md, dll
  superpowers/     specs/ + plans/ (design spec & implementation plan)
  quality/         FINDINGS.md
```

### 1.3 Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | React 18 · TypeScript · Vite 6 · TanStack Router/Query/Table · Tailwind CSS 3 · shadcn/ui · recharts 3 · Zod · react-hook-form |
| **Backend** | NestJS 10 · TypeScript — Domain-Oriented Modular Monolith (17 domain, 28 controller) |
| **Database** | PostgreSQL (satu schema Prisma, **112 model**) · Redis (BullMQ) · MinIO/S3 |
| **Identity** | Keycloak (ada di compose; **aktual masih JWT lokal + bcrypt**) |
| **Monitoring** | OpenTelemetry · Prometheus · Grafana · Loki · Tempo |
| **Testing** | Jest + supertest (API unit/e2e) · Vitest + Testing Library (web, termasuk a11y) |
| **CI** | GitHub Actions: prisma generate → lint → test → typecheck → build + build Docker image |

### 1.4 Domain Backend

| Domain | Kapabilitas |
|---|---|
| **foundation** | LegalEntity, Organization, User, Role/Permission (RBAC), AuditLog, Auth (JWT+bcrypt), Currency, DOA, Foundation Hardening |
| **project** | Project, WBS (tree), Budget (publish), CostCode, ControlAccount, Forecast, EarnedValue, health, portfolio |
| **procurement** | PurchaseRequisition → PurchaseOrder (+Change) → RFQ; vendor rating/performance |
| **inventory** | Warehouse, GoodsReceipt, MaterialIssue, StockAdjustment/Opname/Transfer, StockLedger |
| **approval** | WorkflowDefinition → steps, ApprovalTask, ConditionEvaluator, maker-checker |
| **finance** | GL (ChartOfAccount, Journal, TrialBalance), AP (VendorInvoice→Payment), AR (ProgressClaim→ClientInvoice→Collection), Variation, Subcontract, PeriodClose, Intercompany, Consolidation, FinancialStatement |
| **treasury** | BankAccount, PaymentProposal, BankGuarantee, CashForecast, FxExposure, CashPosition |
| **construction** | WorkPackage, DailyReport, Commissioning, Handover |
| **commercial** | Client, Opportunity, Contract, BidDecision, Estimate, PricingScenario, Deviation, TenderSubmission, Amendment |
| **engineering** | Deliverable, Drawing(+Revision), Rfi, Submittal, Transmittal |
| **hcm** | Employee(+lifecycle), ProjectAssignment, Timesheet, PayrollAllocation, Equipment(+PM/breakdown/usage/utilization) |
| **hse** | SafetyObservation, HseIncident, PermitToWork, CorrectiveAction |
| **quality** | Itp, InspectionRequest, Ncr, PunchListItem |
| **governance** | Risk, AuditEngagement/Finding, LegalCase, AccessReview |
| **analytics** | Executive, signals, anomalies, cash-flow, aging, project-cost-summary, cost-composition (+ CSV export) |
| **master-data** | Data master lintas domain |

### 1.5 Arsitektur Frontend (Feature-Sliced Design)

```text
apps/web/src/
  app/        layouts (AppShell, SidebarNav, Topbar), providers (query, error-boundary), router
  pages/      komposisi per halaman (53 halaman, lazy-loaded)
  widgets/    blok UI lintas halaman (dashboard-*, status-badge, health-badge, dst.)
  features/   per domain (19 domain): model/*.api.ts (hooks) + ui/*.tsx (form/grid)
  entities/   hook baca ringan (project, user, role, wbs, legal-entity, health)
  shared/     lib (http, format, pagination, labels, use-url-state, unsaved-guard), styles
  routeTree.tsx  definisi seluruh route TanStack Router
```

**HTTP & data:**

- `shared/lib/http.ts` — `getJson`/`postJson`/`downloadFile` ke prefix `/api/v1`; menyisipkan Bearer token; `jsonReviver` mengubah string numerik → number (kecuali key Code/Number/Id/Phone/Currency/…). 401 → logout + redirect.
- Token & sesi di `localStorage` (`aec_token`, `aec_session`).
- Data fetching: **TanStack Query**; tabel: **TanStack Table** via `DataGrid` dari `@aec/ui`.
- Kontrak tipe divalidasi dengan **Zod** dari `@aec/api-contracts` (mis. `portfolioSchema.parse(...)`).

**Kontrak antar-layer:**

```text
Prisma model ──► service (domain) ──► controller (@Permissions) ──► HTTP /api/v1
                     │                                                  │
                     └─► packages/api-contracts (Zod) ◄────────────────┘
                                       │
                           web: features/*/model/*.api.ts (useQuery/useMutation)
```

`packages/api-contracts` adalah **sumber kebenaran bentuk response** — dipakai API (untuk tipe) dan web (untuk `.parse()`).

### 1.6 Navigasi Sidebar (8 grup)

| Grup | Item |
|---|---|
| **Main** | Dashboard `/`, Executive Analytics `/analytics`, Advanced Reporting `/analytics/reporting`, Approval `/approvals`, Workflow `/workflows` |
| **Foundation** | Legal Entities, Foundation Hardening, Master Data, User Management, Role Management, Audit Trail |
| **Project & Engineering** | Projects, WBS, Budget, Project Health, Project Controls, Engineering |
| **Commercial & Tender** | Commercial, Tender & Bid |
| **Procurement & Inventory** *(collapsed)* | PR, PO, RFQ, Procurement Hardening, Goods Receipt, Material Issue, Stock Adjustment/Opname/Transfer/Ledger |
| **Finance & Treasury** *(collapsed)* | Vendor Invoice, Payment, Progress Claim, Client Invoice, Collection, Variation Order, Subcontract, GL Journal, Trial Balance, COA, Finance Closure, Treasury |
| **Construction & HCM** | Work Packages, Daily Report, Commissioning, Handover, Employee, Timesheet, Equipment, Payroll Allocation |
| **Governance** | HSE, Quality, Governance |

### 1.7 Perintah Penting (dari root)

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Jalankan semua app dev (turbo) |
| `pnpm build` | Build semua |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Kualitas kode |
| `pnpm --filter @aec/api test:unit` | Unit test API (jest, `*.spec.ts`) |
| `pnpm --filter @aec/api test:e2e` | E2E API (supertest, butuh Postgres+Redis) |
| `pnpm --filter @aec/api db:setup` | Migrate + seed dasar + seed demo (dev/VPS) |
| `pnpm --filter @aec/api db:seed` | Seed data dasar saja (dipakai test) |
| `pnpm --filter @aec/web dev` | Vite dev server web |
| `pnpm --filter @aec/web test` | Vitest web |

**Kredensial demo seed:** `admin@aec.local` / `Admin123!` · `buyer@aec.local` / `Buyer123!`

### 1.8 Konvensi & Aturan Penting

- **Git:** `main` (prod) · `develop` (integrasi) · `feature/{FR-xxx}-{slug}`. 1 requirement PRD = 1 branch (merge commit, **no squash**). PR wajib review + CI hijau + requirement ID.
- **Bahasa:** kode & identifier Inggris; komentar campur ID/EN (sedang diseragamkan ke Inggris). Pesan user-facing Inggris.
- **Error:** selalu `{ error: { code, message, details, correlationId } }`, kode `SCREAMING_SNAKE`. Filter map Prisma P2002→409, P2025→404, P2003→409, P2034→409.
- **Uang/angka:** `Decimal` di DB → `number` di JSON (interceptor + jsonReviver). Semua angka di UI: `font-mono tabular-nums`.
- **Nomor dokumen:** via `SequenceHelper`/`NumberSequence`, format `PREFIX-TAHUN-EPC-000001`.
- **Integritas & konkurensi:** tulis stok/budget/invoice/approval dibungkus `withSerializableRetry` (SERIALIZABLE + retry) + compare-and-set guard status → cegah TOCTOU & double-action. Auto-journal via `GlHelper` (menerima `tx` pemanggil → atomik dengan perubahan status). Guard periode `assertPeriodOpen` (tolak posting ke periode CLOSED/LOCKED). Setiap transisi status menulis `AuditLog`.
- **Periode akuntansi:** Asia/Jakarta (UTC+7).
- **Permission:** 175+ kode permission, cek via `@Permissions(...)` + `PermissionsGuard` (UserRole→Role→RolePermission, effective-dated).
- **Humanizer:** `labels.ts` (`labelAction`/`labelResource`/`labelRole`/`labelErrorCode`) wajib dipakai untuk merender kode backend (dijaga aturan ESLint).

### 1.9 Status Project

- **Fase:** 0 (Engineering Foundation)
- **Branch aktif:** `feat/dashboard-polish`
- Dashboard sudah melewati program redesign multi-fase **A → B → C** (semua merge: PR #278, #279, #280); fase **polish** sedang berjalan.
- **Utang teknis yang disadari:** Keycloak belum terintegrasi (JWT lokal); worker BullMQ masih template; `docs/prd`, `erd`, `adr` belum ada; README menyebut "schema per domain" padahal satu schema Prisma.

---

## 2. Halaman Dashboard (`/`)

**File:** `apps/web/src/pages/dashboard.page.tsx`
**Route:** `/` (landing, lazy-loaded, di bawah `appRoute` dengan `beforeLoad: requireAuth`, direender dalam `AppShell`)
**Tagline:** *Portfolio command center · cost, cash & health*
**Tujuan:** dalam 5 detik seorang manajer tahu apa yang butuh perhatian, posisi kas, dan proyek mana yang menyimpang — lalu bisa mengklik untuk menelusuri penyebabnya.

### 2.1 Prinsip Desain

- **Design system-first** — tidak ada warna/font/radius baru; improvisasi hanya pada komposisi, hierarki informasi, bentuk visualisasi, densitas, dan gerak.
- **Aditif di backend** — tanpa query param, endpoint berperilaku identik dengan sebelumnya.
- **Bisa ditelusuri (drill-through)** — setiap angka bermakna punya tujuan drill-down yang benar-benar menyaring daftar tujuan.
- **Exception-driven monitoring** — dashboard menunjukkan penyimpangan; `/analytics` tetap tempat eksplorasi.
- **Satu angka juara per zona** — hanya satu metrik besar (Cash on hand).
- **Bentuk > teks** — bullet graph, sparkline, scatter, stacked bar menggantikan kolom angka telanjang.
- **Warna tak pernah sendiri** — health/EVM selalu dot/badge **dan** label teks.
- **Overview → zoom → detail** (Shneiderman); jujur soal data kosong (proyek tanpa EVM ditandai, bukan dipaksa 0).

### 2.2 Susunan Zona (urutan vertikal = urutan prioritas)

```text
Zona 0  DashboardFilterBar   periode + entity + reload + last-updated + chip filter aktif
Zona 1  SignalRail           chip "perlu tindakan", urut severity → umur → jumlah (scroll-x)
Zona 2  HeroBand ‖ LiquidityPanel   (grid 12 kolom, 7 ‖ 5)
          HeroBand           Cash on hand (+sparkline) + Net cash flow + narasi + 3 StatCard
          LiquidityPanel     Runway, sparkline burn, AR/AP bullet, working-capital gap
Zona 3  FinancialBand        grid 12 kolom: Cash Flow (7) ‖ [Aging AR/AP + Budget Burn] (5)
Zona 4  PortfolioZone        Toggle [Canvas | Tabel] + AnomalyTriage
```

**Layout responsif:**

- `≥1280px (xl)`: Hero (7) ‖ Liquidity (5) → FinancialBand (Cash Flow 7 ‖ Aging+Burn 5) → Portfolio & Triage lebar penuh. Konten dibatasi `max-w-[1600px]` agar tidak renggang di layar ultra-wide.
- `768–1279px (md)`: Hero penuh → Liquidity penuh → Financial penuh → Portfolio.
- `<768px (sm)`: Context → Signal (scroll-x) → Hero → Financial → Portfolio; default view = **Tabel**.

**Motion:** tiap zona render dengan `animate-slide-up` stagger 40ms (`animationDelay: i * 40ms`); dinonaktifkan pada `prefers-reduced-motion: reduce`.

### 2.3 Detail Per Widget

#### ① DashboardFilterBar — `widgets/dashboard-filter-bar/`

- **SegmentedControl** periode: `MTD · QTD · YTD · 12M` (default `YTD`).
- **EntitySelect** legal entity (opsi "All entities" = tanpa filter; opsi dari `useLegalEntities`, format `code · legalName`).
- Button **Reload** + **LastUpdated** (relative time dari query cache).
- **Chip filter aktif** yang bisa dihapus satu-satu: `Entity: x`, `Health: x`, `Aging: x`.
- State filter hidup di **URL** (dapat dibagikan/di-bookmark) via `useUrlFilter`.
- Hook `useDashboardFilter()` menerjemahkan preset periode → `{ from, to }` ISO date via `resolvePeriod()` (`shared/lib/dashboard-period.ts`): MTD/QTD/YTD/12M dihitung dari `now`; `to` selalu hari ini.

#### ② SignalRail — `widgets/signal-rail/`

- Sumber: `GET /analytics/signals` via `useSignals(filter)` (refetch tiap 30 detik).
- Rail horizontal **scrollable** (`overflow-x-auto`, chip `shrink-0` — tidak wrap).
- Setiap chip: dot severity + count + label + konteks + **umur dokumen tertua** (`oldestAgeDays`), mis. `● 2 NCR · open · oldest 12d`.
- Urutan: severity menurun (HIGH → LOW) → umur menurun → jumlah menurun.
- Chip dengan jumlah 0 disembunyikan; bila semua nol → `EmptyState` "All clear — no open signals".
- **Deep-link yang benar-benar menyaring halaman tujuan:**

| Sinyal | Tujuan deep-link |
|---|---|
| Anomali (HIGH/MEDIUM/LOW) | `/analytics` |
| NCR terbuka | `/quality?tab=ncrs&status=OPEN` |
| Insiden terbuka | `/hse?tab=incidents&status=OPEN` |
| PM equipment jatuh tempo | `/hcm/equipment` |
| Punch item terbuka | `/quality?tab=punch&status=OPEN` |
| Progress claim DRAFT | `/finance/progress-claims?status=DRAFT` |
| Approval menunggu | `/approvals` |
| AR lewat jatuh tempo (61-90, 90+) | `/finance/client-invoices` |

- Catatan: sinyal bersifat operasional (NCR/insiden/claim), bukan per-health proyek — Signal Rail **tidak** mengikuti cross-filter health.

#### ③ HeroBand — `widgets/hero-band/`

- **Cash on hand** (dari `/treasury/cash-position` `totalBalance`) — overline `CASH ON HAND · bank balances`, angka `text-display` (2.5rem) `font-mono tabular-nums`, warna via `valueTone()` → `> 0` `financial-positive-600`, `< 0` `financial-negative-600`, **`0` `neutral-950`** (nol bukan positif). Sparkline tren kas (`useCashFlow`) di samping angka. Seluruh hero dibungkus **panel ber-border** (sejajar dengan LiquidityPanel). Saat loading tampil skeleton (bukan `Rp 0` menyesatkan).
- **Capital Structure** (`widgets/capital-structure/`) — tiga bar horizontal **skala bersama** (Contract ⊇ Budget ⊇ Actual) menggantikan grid 3 StatCard. Warna netral (`neutral-200/400/800`); **Actual Cost** memakai `destructive-500` hanya bila `actual > budget` (overrun). Angka `font-mono tabular-nums` rata kanan.
- **Net cash flow · period** = `executive.finance.cashIn − cashOut` + `DeltaBadge` (delta vs periode sebelumnya via `compare=previous`).
- **Narasi satu kalimat** (fungsi murni `heroNarrative`): *"Cash on hand Rp X; net cash flow positive; N critical project(s); M open NCR(s)."*
- **3 StatCard:**
  - Contract Value (+ konteks jumlah proyek)
  - Budget — label "(baseline)" (tidak difilter periode) + delta
  - Actual Cost (+ konteks "% of budget")
- KPI mengikuti cross-filter `health`: bila aktif, KPI di-re-agregasi dari item portofolio yang sehat itu via `summarizePortfolio()`; tanpa filter pakai agregat server.

#### ④ LiquidityPanel — `widgets/liquidity-panel/`

- **Runway** sebagai metrik utama: `computeRunway(cashOnHand, monthlyBurn)`; `null` → `—` + catatan "No net burn · cash-generative". **Tidak** mengulang Cash on hand (itu milik HeroBand).
- **Net cash · 3 mo** — sparkline net cash flow bertanda (dengan garis nol `baseline={0}`).
- **Net burn bulanan** = `computeNetBurn(netSeries)` = rata-rata defisit bulan-bulan merugi saja (bulan surplus **tidak** dihitung sebagai burn; semua surplus → 0).
- **Working capital** — bar **diverging** (`DivergingBar`): AP ke kiri, AR ke kanan dari titik nol; `Working-capital gap = AR − AP` warna sesuai tanda (nol = netral).

#### ⑤ FinancialBand — `widgets/financial-band/`

- **Cash Flow:** bar chart (recharts) 12 bulan cash in/out dari `useCashFlow(filter)`; ringkasan Total In / Total Out / Net dengan warna token. Kolom kiri (7/12) di baris FinancialBand.
- **Aging AR / AP:** satu batang tersegmentasi per sisi, bucket `CURRENT · 1-30 · 31-60 · 61-90 · 90+`; legenda per bucket; label total per sisi; empty-safe ("No outstanding receivables/payables"). Berbagi satu panel dengan Budget Burn di kolom kanan (5/12), dipisah divider internal (bukan kartu terpisah).
  - **Tiap bucket adalah tombol** → meng-set cross-filter `bucket` (klik ulang = lepas); bucket aktif di-highlight `neutral-800` (bukan merah).
- **Budget Burn:** bullet bar `actual / budget` (dari portfolio totals) + penanda target + label; `budget = 0` → lebar 0 (anti divide-by-zero).

#### ⑥ PortfolioZone — toggle `[Canvas | Tabel]` (SegmentedControl, state di URL `view`)

**Mode Canvas** — `widgets/portfolio-canvas/` (recharts ScatterChart):

- Sumbu X = **CPI**, Y = **SPI**, domain 0.6–1.4, garis kuadran `ReferenceLine` di 1.0/1.0.
- Ukuran/posisi titik dari join `usePortfolio(filter)` × `usePortfolioEvm(filter)` via `buildEvmPoints()` (join `projectId`).
- Warna titik = health: ON_TRACK hijau `#22c55e`, AT_RISK kuning `#f59e0b`, CRITICAL merah `#ef4444`, NO_BUDGET abu `#a1a1aa`.
- Proyek **tanpa EVM** → titik diletakkan di persilangan 1.0 dengan opacity 0.35 + tooltip "No EVM data" (jujur soal data kosong).
- **Empty state edukatif** (0 proyek): kerangka chart nyata dengan sumbu samar X=CPI / Y=SPI, garis referensi putus-putus di 1.0/1.0, watermark scatter transparan, dan pesan tengah *"Belum ada data portofolio. Sinkronkan proyek Anda untuk memulai analisis EVM."* (juga `aria-label`) — bukan kotak putih kosong.
- **Klik legenda health** → set/unset cross-filter `health` → menyaring KPI (Hero) + tabel; titik di luar filter diredupkan (opacity 0.2).
- Klik titik → `/project-health?project={id}`.
- Caption: *X = CPI (cost efficiency) · Y = SPI (schedule efficiency) · crosshair at 1.0 · click a legend to filter*.

**Mode Tabel** — `widgets/portfolio-spine/` (DataGrid TanStack Table):

- Kolom: Project (code mono + name), Client, Health (dot + label badge), Utilization (BulletBar 0–100), Budget vs Actual (MiniStackedBar), Variance (berwarna sesuai tanda), Revenue, Margin %, **CPI / SPI** (hijau ≥ 1, merah < 1, "—" bila tanpa EVM).
- Baris difilter oleh cross-filter `health`; klik baris → `/project-health?project={id}`.
- Loading/error/retry + empty state via `DataGrid`.

**Rumus EVM (Fase B, dihitung runtime backend):**

- `CPI = EV/AC`, `SPI = EV/PV` (null bila belum ada data)
- `EAC = BAC / CPI` (CPI ≤ 0 → BAC)
- `VAC = BAC − EAC`
- `TCPI = (BAC − EV) / (BAC − AC)`

#### ⑦ AnomalyTriage — `widgets/anomaly-triage/`

- Sumber: `useAnomalies()` (`GET /analytics/anomalies`).
- Dikelompokkan per severity (HIGH → MEDIUM → LOW) via `groupAnomalies()`; grup kosong dibuang.
- Header: judul + badge total (`warning` bila ada, `success` bila nol).
- Tiap item: type (mono) + projectCode (mono) + message; empty state "No anomalies — Nothing flagged across the portfolio."

### 2.4 Data Sources / API Endpoints

| Endpoint | Dipakai oleh |
|---|---|
| `GET /analytics/executive?legalEntityId&from&to&compare=previous` | KPI hero + delta periode sebelumnya |
| `GET /analytics/signals?legalEntityId&from&to` | Signal Rail (count + oldestAgeDays) |
| `GET /analytics/anomalies` | Anomaly triage |
| `GET /analytics/cash-flow?legalEntityId&from&to` | Cash flow chart + burn series (liquidity) |
| `GET /analytics/aging?legalEntityId` | Aging AR/AP (snapshot, tidak difilter periode) |
| `GET /analytics/cost-composition?legalEntityId&from&to` | Komposisi biaya (chart donut + legenda) |
| `GET /analytics/project-cost-summary` | Cost summary per proyek |
| `GET /projects/portfolio?legalEntityId` | Daftar portofolio + health + totals + healthCounts |
| `GET /projects/portfolio/evm?legalEntityId` | Rollup EVM per proyek (bac, ev, pv, ac, cpi, spi, eac, vac, tcpi, progressPercent, hasEvm) |
| `GET /approvals/pending-count` | Jumlah approval menunggu |
| `GET /treasury/cash-position` | Cash on hand (totalBalance) |

**Aturan endpoint (semua aditif):**

- Tanpa param → perilaku identik dengan sebelumnya.
- Tanggal `from`/`to` format ISO `YYYY-MM-DD`; validasi `from ≤ to` (400 `INVALID_DATE_RANGE`), rentang maks 5 tahun (400 `DATE_RANGE_TOO_WIDE`).
- **Budget** tidak difilter periode (baseline, `createdAt`) → label "(baseline)".
- **Aging** tidak difilter periode (snapshot posisi saat ini) → hanya `legalEntityId`.
- Cache key analytics: `${key}:${legalEntityId ?? 'all'}:${from ?? ''}:${to ?? ''}`; `invalidateAnalytics()` menghapus seluruh key prefix.
- `GET /analytics/executive?compare=previous` menambah blok `previous` + `delta` per metrik `{ current, previous, pctChange, direction }` (pctChange null bila previous = 0).

### 2.5 State URL Dashboard

```text
?period=&entity=&health=&bucket=&view=&status=&tab=
```

| Param | Fungsi |
|---|---|
| `period` | Preset periode: `MTD` \| `QTD` \| `YTD` (default) \| `12M` |
| `entity` | Legal entity terpilih (`''` = All entities) |
| `health` | Cross-filter health proyek (`ON_TRACK`/`AT_RISK`/`CRITICAL`/`NO_BUDGET`) |
| `bucket` | Cross-filter bucket aging (`CURRENT`/`1-30`/`31-60`/`61-90`/`90+`) |
| `view` | Mode portofolio: `canvas` (default) \| `tabel` |

Semua state dapat dibagikan/di-bookmark. Mengubah periode/entity → semua hook refetch dengan `queryKey` baru (cache terpisah).

### 2.6 Design System

- **Warna:** `neutral-800` untuk state **terpilih/aktif** (SegmentedControl, bucket aging, legend health) — merah **tidak** dipakai untuk seleksi; `racing-red-600` hanya untuk **aksi/perhatian** (tombol primary, focus ring, isi data-bar); `neutral-50..950`, semantik `success/warning/destructive/info`, `project-on-track/at-risk/critical-*`, `financial-positive/negative-*`. Semua warna chart di-impor dari `widgets/dashboard-charts/chart-colors.ts` (bersumber token) — **tidak boleh menulis hex baru di komponen**.
- **Semantik angka nol:** nilai finansial `0` (kas, net cash flow, working-capital gap) dirender **netral** (`text-neutral-950`), bukan hijau — lihat helper `shared/lib/value-tone.ts` (`valueTone`/`TONE_CLASS`). Nol bukan kondisi positif.
- **Tipografi:** `overline` (label kecil uppercase), `display` (2.5rem/600, hanya angka hero), `h1/h2/h3`, `body/body-sm`, `caption`; font IBM Plex Sans / IBM Plex Mono; semua angka `font-mono tabular-nums`.
- **Bentuk:** `rounded-md` (6px) / `rounded-lg` (8px band), elevasi `shadow-xs`, kartu `border border-neutral-200 bg-white`.
- **Gerak:** `duration-fast` (150ms) untuk transisi; reveal `slide-up` stagger 40ms; dinonaktifkan `prefers-reduced-motion`.
- **Aksesibilitas:** Canvas selalu punya padanan Tabel (toggle); health selalu dot **dan** label; `SegmentedControl` = `role="radiogroup"` + navigasi panah; `SignalChip` = `<a>` nyata + `aria-label` deskriptif; nilai DataBar juga tersedia sebagai teks `sr-only`; kontras `neutral-500` minimum di surface putih.

### 2.7 Primitif UI Pendukung (`packages/ui`)

| Primitif | Fungsi |
|---|---|
| `StatCard` | overline + nilai + baris konteks + delta opsional |
| `SegmentedControl` | pilihan tunggal (radiogroup + arrow keys); terpilih `bg-neutral-800` |
| `SignalChip` | chip sinyal: dot severity + count + label + link |
| `BulletBar` | satu nilai vs max |
| `MiniStackedBar` | dua segmen (actual vs sisa budget) |
| `Sparkline` | SVG inline, `role="img"` + aria-label rentang nilai, aman < 2 titik; prop `baseline` opsional (garis referensi nol) |
| `DivergingBar` | bar dua arah dari titik nol (mis. AP ◀ 0 ▶ AR), skala terhadap besaran terbesar |
| `ChartSkeleton` / `ListSkeleton` | skeleton berbentuk chart batang / daftar baris (pengganti teks "Loading…") |
| `EmptyState` | + prop `icon` & `tone` (`neutral`\|`success`) untuk empty state tenang |
| `DeltaBadge` | `▲ +12%` / `▼ −3%` / `→ 0%` (arah + warna token) |
| `FilterChip` | label + tombol hapus (✕) |
| `EntitySelect` | select dengan search |
| `DataGrid` | TanStack Table enterprise (loading/error/retry/empty); kolom `size` → `min-width`, `meta.align` → rata kanan |
| `EmptyState` / `ErrorState` / `Badge` / `Button` | dasar |

### 2.8 Testing Dashboard

- `pages/dashboard.page.test.tsx` — render seluruh zona (semua widget di-mock, assert testid masing-masing).
- Tiap widget punya `.test.tsx`: `signal-rail`, `hero-band`, `liquidity-panel`, `financial-band`, `portfolio-canvas`, `portfolio-spine`, `anomaly-triage`, `dashboard-filter-bar`, `dashboard-charts/*` (chart-colors, cost-composition, cash-flow-area).
- Fungsi murni yang diuji: `resolvePeriod`, `heroNarrative`, `summarizePortfolio`, `buildEvmPoints`, `filterByHealth`, `computeRunway`, `workingCapitalGap`, `groupAnomalies`, `activeFilters`, `buildSignals`, `agingSegments`, `hasOutstanding`, `hasCostData`, `valueTone`, `bulletWidth`.
- Terdapat juga uji a11y umum (`test/a11y.test.tsx`).

### 2.9 Struktur File Dashboard

```text
apps/web/src/
  pages/
    dashboard.page.tsx            komposisi 5 zona
    dashboard.page.test.tsx
  widgets/
    dashboard-filter-bar/         Zona 0 — filter periode/entity + chip aktif
    signal-rail/                  Zona 1 — chip sinyal + deep-link
    hero-band/                    Zona 2 (kiri) — cash on hand + KPI + narasi
    liquidity-panel/              Zona 2 (kanan) — runway, AR/AP, gap
    financial-band/               Zona 3 — cash flow + aging + budget burn
    portfolio-canvas/             Zona 4 — scatter CPI×SPI
    portfolio-spine/              Zona 4 — tabel portofolio
    anomaly-triage/               Zona 4 — triage anomali per severity
    dashboard-charts/
      charts.tsx                  CashFlowChart, AgingBar, HealthDonut (legacy)
      chart-colors.ts             CHART, HEALTH_COLORS, AGING_COLORS, COST_COLORS (dari token)
      cost-composition-chart.tsx  donut komposisi biaya + legenda persen
      cash-flow-area.tsx          area chart arus kas + tren
      aging-stacked-bar.tsx       (baru, fase polish)
    last-updated/                 waktu relatif query cache
    health/                       health-badge
  shared/lib/
    dashboard-period.ts           PeriodPreset, DashboardFilter, resolvePeriod
    use-url-state.ts              useUrlFilter (state filter di URL)
    format.ts                     formatIdr, dll.
  features/
    analytics/model/analytics.api.ts   useExecutiveDashboard, useSignals, useAnomalies,
                                       useCashFlow, useAging, usePendingApprovals,
                                       useProjectCostSummary, useCostComposition, exportAnalytics
    project/model/project.api.ts       usePortfolio, usePortfolioEvm
    treasury/model/...                 useCashPosition
```

---

## 3. Riwayat Redesign Dashboard

Program multi-fase (arah visual final: kerangka *Control Room*, portofolio *Relational Canvas*, hero *Editorial*):

| Fase | Isi | Status |
|---|---|---|
| **A** — Fondasi fungsional | 5 zona (Context bar, Signal Rail, Hero, Financial Band, Portfolio Canvas+Tabel), filter entity/periode di URL, drill-through, chart finansial, endpoint `pending-count` | Merge (PR #278) |
| **B** — Financial intelligence | EVM rollup (CPI/SPI/EAC/VAC/TCPI), Cash on hand + runway, working-capital gap, koherensi dua definisi kas, deep-link menyaring status | Merge (PR #279) |
| **C** — Interaksi & prioritas | Umur dokumen di Signal Rail (`oldestAgeDays`), cross-filter linked views (health & aging bucket), delta periode (`compare=previous`), triage anomali, chip filter aktif | Merge (PR #280) |
| **Polish** — Analytical density | Token-compliant charts, loading skeletons, empty states, layout Z-pattern, chart baru (cost composition, cash-flow area, aging stacked bar, project ranking, budget bullet), seed demo lebih realistis | Branch aktif `feat/dashboard-polish` |
| **D** — Produktivitas | Saved views, command palette ⌘K, keyboard-first (`j/k`/Enter), ekspor view terfilter | Belum dikerjakan |

---

## 4. Referensi

- `README.md` — ringkasan platform
- `docs/architecture/CODEBASE-MAP.md` — peta orientasi kontributor (paling lengkap)
- `docs/superpowers/specs/2026-10-05-dashboard-redesign-phase-a-design.md`
- `docs/superpowers/specs/2026-10-05-dashboard-redesign-phase-b-design.md`
- `docs/superpowers/specs/2026-10-05-dashboard-redesign-phase-c-design.md`
- `docs/superpowers/plans/2026-10-05-dashboard-polish.md`
- `docs/quality/FINDINGS.md` — catatan kualitas/utang teknis

---

*Dokumen ini disusun dari analisis codebase pada branch `feat/dashboard-polish` (repository: `archipelago-engineering-and-construction-group`).*
