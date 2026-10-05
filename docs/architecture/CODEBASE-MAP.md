# AEC ERP — Codebase Map

> Peta orientasi untuk kontributor. Menjelaskan **di mana** sesuatu berada dan **bagaimana** potongan-potongan tersambung. Untuk aturan bisnis detail lihat PRD (belum tersedia di repo — lihat §Catatan).

---

## 1. Apa ini

**AEC ERP** — platform ERP untuk perusahaan konstruksi/EPC: multi-company, multi-project, multi-region, multi-currency, multi-business-unit. Backbone-nya project-centric: satu proyek mengikat budget, procurement, inventory, biaya (GL), progress claim, sampai serah terima.

- Monorepo: **pnpm workspace + Turborepo**
- Node ≥ 20 · pnpm 10.33.3

## 2. Struktur monorepo

```text
apps/
  api/        NestJS modular monolith (17 domain) + Prisma + BullMQ worker
  web/        React SPA (Feature-Sliced Design)
packages/
  api-contracts/  Skema Zod + tipe request/response per domain (kontrak FE↔BE)
  shared-types/   Enum/tipetransversal (TransactionStatus, dll)
  validation/     Skema validasi bersama
  ui/             Design system (primitives + enterprise components)
  config/         Preset tsconfig / eslint / prettier / tailwind
infrastructure/
  docker/     compose.dev.yml, compose.prod.yml, nginx
  database/   slot migrasi/seed tingkat infra (dipakai Prisma di apps/api)
docs/         (masih kosong — lihat §Catatan)
```

**Perintah penting** (dari root):

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Jalankan semua app dev (turbo) |
| `pnpm build` | Build semua |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Kualitas |
| `pnpm --filter @aec/api test:unit` | Unit test API (jest, `*.spec.ts`) |
| `pnpm --filter @aec/api test:e2e` | E2E API (supertest, butuh Postgres+Redis) |
| `pnpm --filter @aec/api db:seed` | Seed DB |
| `pnpm --filter @aec/web dev` | Vite dev server web |

## 3. Backend (`apps/api`)

### 3.1 Pola modul

Setiap domain punya bentuk seragam:

```text
modules/<domain>/
  <domain>.module.ts              @Module({ imports:[SharedModule], controllers, providers })
  index.ts                        barrel: export { <Domain>Module }
  application/services/*.ts       logika bisnis (1 service per kapabilitas)
  presentation/controllers/*.ts   HTTP handler + @UseGuards(AuthGuard, PermissionsGuard)
  presentation/dto/*.dto.ts       class-validator DTO
```

> **Catatan DI:** `SharedModule` bersifat `@Global()` dan mengekspor `PrismaService` +
> helper bersama. Modul domain **tidak** boleh men-deklarasikan `PrismaService` sendiri —
> itu akan membuat PrismaClient baru per modul (lihat `docs/quality/FINDINGS.md` F7).

Registrasi modul: `src/app.module.ts`. Bootstrap: `src/main.ts` (global prefix `api/v1`, helmet, compression, CORS, `DecimalToNumberInterceptor`). Worker BullMQ: `src/worker.ts`.

### 3.2 Domain & kapabilitas

| Domain | Controllers | Highlights |
|---|---|---|
| **foundation** | 6 | LegalEntity, Organization, User, Role/Permission (RBAC), AuditLog, Auth (JWT+bcrypt), Currency, DOA, Foundation Hardening |
| **project** | 4 | Project, WBS (tree), Budget (publish), CostCode, ControlAccount, Forecast, EarnedValue, health, portfolio |
| **procurement** | 2 | PurchaseRequisition → PurchaseOrder (+Change) → RFQ; vendor rating/performance |
| **inventory** | 1 | Warehouse, GoodsReceipt, MaterialIssue, StockAdjustment/Opname/Transfer, StockLedger |
| **approval** | 1 | WorkflowDefinition → steps, ApprovalTask, ConditionEvaluator, maker-checker (BR-003) |
| **finance** | 2 | GL (ChartOfAccount, Journal, TrialBalance), AP (VendorInvoice→Payment), AR (ProgressClaim→ClientInvoice→Collection), Variation, Subcontract, PeriodClose, Intercompany, Consolidation, FinancialStatement, `GlHelper` |
| **treasury** | 1 | BankAccount, PaymentProposal, BankGuarantee, CashForecast, FxExposure, CashPosition |
| **construction** | 1 | WorkPackage, DailyReport, Commissioning, Handover |
| **commercial** | 2 | Client, Opportunity, Contract, BidDecision, Estimate, PricingScenario, Deviation, TenderSubmission, Amendment |
| **engineering** | 1 | Deliverable, Drawing(+Revision), Rfi, Submittal, Transmittal |
| **hcm** | 1 | Employee(+lifecycle), ProjectAssignment, Timesheet, PayrollAllocation, Equipment(+PM/breakdown/usage/utilization) |
| **hse** | 1 | SafetyObservation, HseIncident, PermitToWork, CorrectiveAction |
| **quality** | 1 | Itp, InspectionRequest, Ncr, PunchListItem |
| **governance** | 1 | Risk, AuditEngagement/Finding, LegalCase, AccessReview |
| **analytics** | 1 | Executive, anomalies, cash-flow, aging, project-cost-summary (+ CSV export) |
| **master-data** | 1 | Data master lintas domain |
| **treasury** | 1 | (lihat di atas) |

Total: **28 controller**.

### 3.3 Cross-cutting (`src/shared`)

| Modul | Isi |
|---|---|
| `database/prisma.service.ts` | PrismaClient + adapter-pg; pool config via URL/`DATABASE_POOL_MAX`; log slow query >`SLOW_QUERY_MS` (200ms) |
| `database/serializable-tx.ts` | `withSerializableRetry` — transaksi SERIALIZABLE + retry backoff. **Kontrak:** semua baca-penentu & tulis di dalam `fn`; audit di luar |
| `guards/auth.guard.ts` | Verifikasi Bearer JWT → `request.user` |
| `guards/permissions.guard.ts` | Cek `@Permissions()` via UserRole→Role→RolePermission (effective-dated) |
| `decorators/permissions.decorator.ts` | `@Permissions(...codes)` |
| `permissions/permissions.ts` | Sumber tunggal 175+ kode permission |
| `filters/all-exceptions.filter.ts` | Response `{ error:{ code, message, details, correlationId } }`; map Prisma P2002→409, P2025→404, P2003→409, P2034→409 |
| `interceptors/decimal-to-number.interceptor.ts` | Decimal Prisma → number saat serialisasi |
| `cache/cache.service.ts` + `cache/analytics-cache.ts` | Cache Redis (lazyConnect, fail-open); `invalidateAnalytics()` menghapus 5 key analytics |
| `queue/queue.service.ts` | BullMQ queue `aec-background` (lazyConnect) |
| `utils/sequence.helper.ts` | Nomor dokumen (NumberSequence upsert; opsional ikut `tx`) |
| `utils/period.ts` | **Periode akuntansi Asia/Jakarta (UTC+7)**: `periodOf`, `periodRange`, `journalPeriodWhere`, `assertPeriodOpen` (tolak posting ke periode CLOSED/LOCKED) |
| `utils/keyset-cursor.ts` | Paginasi keyset (audit log) |
| `utils/tree.util.ts` | Util hierarki (WBS) |
| `export/csv.ts` | CSV streaming (RFC 4180 + BOM) untuk report berat |
| `inventory/stock-ledger-writer.ts` | Penulis StockLedger (menerima `tx`) |
| `project/actual-cost.calculator.ts` | Kalkulasi biaya aktual |
| `config/env.ts` | Validasi env via Zod (DATABASE_URL, JWT_SECRET ≥32, dll) |

### 3.4 Integritas & konkurensi (pola penting)

- **Tulis stok/budget/invoice/approval** dibungkus `withSerializableRetry` + compare-and-set (`updateMany` ber-guard status) → cegah TOCTOU & double-action. Lihat `test/concurrency.e2e-spec.ts`.
- **Auto-journal** (`GlHelper`): semua `post*Journal` menerima `tx` pemanggil (bukan buka transaksi sendiri) supaya perubahan status dokumen + jurnal atomik. Akun GL wajib hilang → hard-fail `GL_ACCOUNT_MISSING` (bukan `null`).
- **Guard periode**: `assertPeriodOpen` dipanggil di dalam `tx` sebelum menulis jurnal.

### 3.5 Data (`apps/api/prisma`)

- `schema.prisma` — **112 model** (satu schema PostgreSQL, bukan schema-per-domain).
- `migrations/` — 4 migrasi (baseline squashed + index + fix stock ledger).
- `seed.ts` (user/role/permission/COA) · `seed-demo.ts` (data demo).
- Kredensial seed: `admin@aec.local` / `Admin123!`, `buyer@aec.local` / `Buyer123!`.

## 4. Frontend (`apps/web`)

### 4.1 Arsitektur Feature-Sliced

```text
src/
  app/        layouts (AppShell, SidebarNav, Topbar), providers (query, error-boundary), router
  pages/      komposisi per halaman (53 halaman, lazy)
  widgets/    blok UI lintas halaman (dashboard-grid, charts, status-badge, health-badge)
  features/   per domain: model/*.api.ts (hooks) + ui/*.tsx (form/grid)  (19 domain)
  entities/   hook baca ringan (project, user, role, wbs, legal-entity, health)
  shared/     lib (http, format, pagination, labels, use-url-state, unsaved-guard), styles
  routeTree.tsx  definisi seluruh route TanStack
```

### 4.2 Routing

Semua route terpusat di `src/routeTree.tsx`. Route aplikasi berada di bawah `appRoute` (`beforeLoad: requireAuth`) yang merender `AppShell`. Halaman dimuat lazy (`lazyRouteComponent`). Navigasi sidebar didefinisikan di `app/layouts/nav-config.ts` (8 grup).

### 4.3 HTTP & data

- `shared/lib/http.ts` — `getJson`/`postJson`/`downloadFile` ke `/api/v1`; menyisipkan Bearer token; `jsonReviver` mengubah string numerik → number (kecuali key Code/Number/Id/Phone/Currency/…). 401 → logout + redirect.
- Token & sesi di `localStorage` (`aec_token`, `aec_session`).
- Data fetching: TanStack Query; tabel: TanStack Table via `DataGrid` dari `@aec/ui`.
- Kontrak tipe divalidasi dengan Zod dari `@aec/api-contracts` (mis. `projectHealthSchema.parse(...)`).

### 4.4 UI kit (`packages/ui`)

- Primitives: Button, Input, Badge, Card, Label, Dialog/ConfirmDialog, Select, Toast, Skeleton.
- Enterprise: `DataGrid`, `StatusBadge`, `EntitySelect`, `ConfirmActionButton`, `EmptyState`/`ErrorState`/`GridState`, `EmptyCell`.
- Humanizer (`labels.ts`): `labelAction`/`labelResource`/`labelRole`/`labelErrorCode` — **wajib** dipakai untuk merender kode backend (dijaga oleh aturan ESLint `no-restricted-syntax`).

## 5. Kontrak antar-layer

```text
Prisma model  ──►  service (domain)  ──►  controller (@Permissions)  ──►  HTTP /api/v1
                        │                                                     │
                        └─► packages/api-contracts (Zod)  ◄───────────────────┘
                                          │
                              web: features/*/model/*.api.ts (useQuery/useMutation)
```

`packages/api-contracts` adalah **sumber kebenaran bentuk response** — dipakai API (untuk tipe) dan web (untuk `.parse()`).

## 6. Alur end-to-end contoh (Procure-to-Pay)

```text
1. Budget dipublish        project: budget.service (publish)
2. Purchase Requisition    procurement: purchase-requisition.service
       └─ guard budget (serializable)
3. Approval                approval: submitForApproval → decide (CAS + maker-checker)
4. Purchase Order          procurement: purchase-order.service → release
5. Goods Receipt           inventory: goods-receipt.service → StockLedger (+qty)
6. Vendor Invoice          finance: vendor-invoice.service → 3-way match → post
       └─ GlHelper.postInvoiceJournal(tx): Dr Beban/PPN, Cr Utang
7. Payment                 finance: payment.service → approve → pay
       └─ GlHelper.postPaymentJournal(tx): Dr Utang, Cr Kas
8. GL & laporan            finance: journal / trial-balance; analytics executive/aging/cash-flow
```

Setiap transisi status menulis `AuditLog` (via `AuditService`) dan meng-invalidate cache analytics bila relevan.

## 7. Konvensi

- **Bahasa**: kode & identifier Inggris; komentar/docstring saat ini campur ID/EN (sedang diseragamkan ke Inggris).
- **Path alias**: API `@/*` → `src/*`; web `@/*` → `src/*`.
- **Error**: selalu `{ code, message }` (kode SCREAMING_SNAKE). Pesan user-facing dalam Inggris.
- **Uang/angka**: Decimal di DB → number di JSON (interceptor + jsonReviver).
- **Nomor dokumen**: lewat `SequenceHelper`/`NumberSequence`, format `PREFIX-TAHUN-EPC-000001`.
- **Git**: `main` (prod) · `develop` (integrasi) · `feature/{FR-xxx}-{slug}`. 1 requirement PRD = 1 branch (merge commit, no squash). PR wajib review + CI hijau + requirement ID.

## 8. Kualitas

- **CI** (`.github/workflows/ci.yml`): `prisma generate` → lint → test → typecheck → build; job kedua build Docker image API & Web. Service Postgres+Redis disediakan.
- **Unit**: jest `*.spec.ts` di samping source (`jest-unit.json`).
- **E2E**: supertest `test/*.e2e-spec.ts` (`jest-e2e.json`), `globalSetup` reset+migrate+seed DB test. `maxWorkers: 1`.
- **Web**: vitest + testing-library (termasuk uji a11y).

## 9. Catatan / utang teknis (lihat juga `docs/quality/FINDINGS.md`)

- `docs/` (prd, erd, adr) yang dijanjikan README belum ada.
- **Keycloak** ada di compose & README, tetapi auth aktual memakai JWT lokal + bcrypt (belum terintegrasi).
- **Worker** (`worker.ts`) masih template: handler `email.send`/`notify.approval` hanya log; belum ada produsen `enqueue()` maupun transport email.
- `ConditionEvaluator` approval baru mendukung `PurchaseRequisition` & `PurchaseOrder`.
- README menyebut "schema per domain"; kenyataannya **satu** schema Prisma.
- Migrasi Prisma dijalankan dari `apps/api/prisma`, bukan `infrastructure/database`.
