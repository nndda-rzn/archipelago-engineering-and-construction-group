# AEC ERP — Quality & Risk Findings

Audit 2026-10-05. Temuan diurutkan berdasarkan tingkat keparahan. Setiap temuan mencantumkan bukti (file/baris) dan rekomendasi. Tidak ada perubahan kode dari dokumen ini.

---

## Ringkasan

| # | Tingkat | Area | Ringkas |
|---|---------|------|---------|
| F1 | **Tinggi** | Identity | README/compose mengklaim Keycloak, tapi auth aktual = JWT lokal + bcrypt. Keycloak tak dipakai kode. |
| F2 | **Tinggi** | Observability | Klaim OpenTelemetry/Prometheus/Grafana/Loki/Tempo di README; tidak ada instrumentasi di kode. |
| F3 | **Sedang** | Docs | `docs/` (prd, erd, adr, business-process) yang dijanjikan README belum ada. |
| F4 | **Sedang** | Background jobs | Worker hanya template; belum ada produsen `enqueue()` maupun transport email. |
| F5 | **Sedang** | Approval | `ConditionEvaluator` hanya mendukung `PurchaseRequisition` & `PurchaseOrder`. |
| F6 | **Sedang** | Data model | README menyebut "schema per domain"; kenyataannya satu schema Prisma. |
| F7 | ~~Sedang~~ **Selesai** | Arsitektur | ~~`PrismaService` didaftarkan per-modul~~ → kini **singleton** via `SharedModule` `@Global()` (2026-10-05). |
| F8 | **Rendah** | Authz | `PermissionsGuard` membaca permission per-request (query DB tiap request, tanpa cache). |
| F9 | **Rendah** | Arsitektur | `intercompany.service.ts` & `period-close.service.ts` mengubah status dokumen tanpa guard CAS/serializable. |
| F10 | **Rendah** | Konsistensi | Beberapa service memakai `$transaction` biasa (bukan `withSerializableRetry`) pada alur yang sensitif. |
| F11 | **Rendah** | Kualitas kode | 1 warning ESLint pra-eksisting di `packages/ui` (react-hooks/incompatible-library). |
| F12 | **Rendah** | Lokalisasi | Komentar kode masih campur ID/EN; hanya string user-facing yang sudah diseragamkan ke Inggris. |
| F13 | **Info** | Infra | Migrasi Prisma dijalankan dari `apps/api/prisma`, bukan `infrastructure/database` (folder infra hanya `.gitkeep`). |
| F14 | **Info** | Test | E2E "Jest did not exit" (open handle Redis) — suite lulus, tapi proses tak keluar bersih. |
| F15 | ~~**Tinggi**~~ **Selesai** | A11y | ~~Drill-through tabel & chart mouse-only~~ → **selesai** (2026-10-10): baris `DataGrid` kini fokusable (`tabIndex` + Enter/Space) dan scatter punya padanan tombol keyboard. Detail: `docs/quality/DASHBOARD-UIUX-AUDIT.md` CON-2. |
| F16 | **Sedang** | Layout | AppShell (`flex h-screen`) tidak menyesuaikan lebar < ~640px: sidebar tetap selebar desktop sehingga `documentElement` meluber horizontal di **semua** halaman (`/projects` 1106 vs 375; `/projects/:id` 569 vs 375). Permukaan halaman sendiri 0 overflow; pelakunya shell + breadcrumb topbar. Ditemukan saat verifikasi WBS (2026-10-12). |

---

## Detail

### F1 — Keycloak diklaim, tidak dipakai (Tinggi)
- **Bukti:** `README.md` baris 12 ("Identity: Keycloak"); `infrastructure/docker/compose.dev.yml` menjalankan service `keycloak`. Namun `apps/api/src/modules/foundation/application/services/auth.service.ts` melakukan login dengan `bcrypt.compare` + `jwt.signAsync` (JWT lokal). Tidak ada referensi `keycloak`/`oidc`/`openid` di kode.
- **Dampak:** Ekspektasi SSO/OIDC tidak terpenuhi; pengelolaan user & sesi terpisah dari klaim arsitektur.
- **Rekomendasi:** Pilih satu arah — (a) integrasikan Keycloak (verifikasi token via JWKS, provisioning user), atau (b) hapus Keycloak dari compose & perbaiki README.

### F2 — Stack observability diklaim, tidak ada instrumentasi (Tinggi)
- **Bukti:** `README.md` baris 13. Tidak ada import `@opentelemetry/*`, `prom-client`, dsb di `apps/api`. Logging hanya `nestjs-pino`.
- **Dampak:** Klaim monitoring tidak dapat diverifikasi; tidak ada metrik/trace.
- **Rekomendasi:** Tambahkan instrumentasi OTel + `/metrics` Prometheus, atau turunkan klaim di README.

### F3 — Dokumentasi hilang (Sedang)
- **Bukti:** `docs/` hanya berisi `.gitkeep` (+ `docs/architecture/CODEBASE-MAP.md` baru). README baris 24 & 36 menjanjikan `docs/prd`, `erd`, `adr`, `business-process`.
- **Dampak:** Requirement ID (FR-xxx/BR-xxx) yang dirujuk di kode tak punya sumber rujukan di repo.
- **Rekomendasi:** Tambahkan PRD/ADR/ERD, atau tandai jelas bahwa sumbernya di luar repo (Obsidian vault).

### F4 — Worker template (Sedang)
- **Bukti:** `apps/api/src/worker.ts` (komentar eksplisit "handler di bawah masih template"). `QueueService.enqueue()` ada tetapi tidak ada pemanggil.
- **Dampak:** Notifikasi async (approval, email) tidak berfungsi.
- **Rekomendasi:** Hubungkan `enqueue()` pada transisi approval, sediakan transport email (SMTP/SES).

### F5 — Approval terbatas 2 tipe transaksi (Sedang)
- **Bukti:** `apps/api/src/modules/approval/application/services/shared/condition-evaluator.ts` — `switch` hanya menangani `PurchaseRequisition` & `PurchaseOrder`; default melempar `UNSUPPORTED_TYPE`.
- **Dampak:** Workflow approval untuk dokumen lain (mis. Payment, Variation) tidak bisa dipakai walau definisi workflow bisa dibuat.
- **Rekomendasi:** Perluas registry tipe transaksi, atau batasi pilihan `transactionType` di UI agar konsisten.

### F6 — "Schema per domain" vs satu schema (Sedang)
- **Bukti:** `README.md` baris 11; kenyataannya `apps/api/prisma/schema.prisma` (112 model, satu file/schema).
- **Dampak:** Ekspektasi isolasi domain tidak terpenuhi.
- **Rekomendasi:** Perbaiki README atau migrasikan ke multi-schema Postgres.

### F7 — ~~`PrismaService` didaftarkan per-modul~~ (SELESAI 2026-10-05)
- **Bukti sebelum:** setiap `<domain>.module.ts` mencantumkan `PrismaService` di `providers` (mis. `project.module.ts:23`, `finance.module.ts:26`), membuat ~17 instance PrismaClient (log startup mencetak "Prisma connected" 17×).
- **Perbaikan:** `SharedModule` kini `@Global()` dan mengekspor `PrismaService`; seluruh modul domain tidak lagi menyediakannya. Didaftarkan sekali di `AppModule`.
- **Verifikasi:** log startup mencatat **1×** "Prisma connected" (dari 17×); 143 unit test lulus; login + 5 endpoint inti via proxy web → 200.

### F8 — Permission dicek per-request (Rendah)
- **Bukti:** `apps/api/src/shared/guards/permissions.guard.ts` menjalankan `userRole.findMany` (dengan include berlapis) pada setiap request yang punya `@Permissions`.
- **Dampak:** Beban DB per request; tidak ada cache.
- **Rekomendasi:** Cache hasil permission per user (Redis, TTL pendek) dengan invalidasi saat role berubah.

### F9 — Beberapa transisi status tanpa CAS (Rendah)
- **Bukti:** `finance/application/services/intercompany.service.ts` (`postIntercompany`) dan `period-close.service.ts` (update status) mengubah status via `update` biasa, bukan compare-and-set. Sebagian besar modul lain sudah memakai pola CAS/serializable.
- **Dampak:** Risiko double-action pada klik ganda (lebih rendah dari modul yang sudah dijaga).
- **Rekomendasi:** Terapkan `updateMany({ where: { status: 'DRAFT' } })` + cek `count`.

### F10 — Inkonsistensi pemakaian `withSerializableRetry` (Rendah)
- **Bukti:** `payment.service.ts`, `collection.service.ts`, `client-invoice.service.ts`, `vendor-invoice.service.ts` memakai serializable untuk posting; `journal.service.ts` `postJournal` memakai `$transaction` biasa (dengan CAS) dan `createJournal` guard periode.
- **Dampak:** Perbedaan tingkat proteksi antar alur serupa.
- **Rekomendasi:** Dokumentasikan kapan serializable wajib (alur dengan read-then-write lintas baris) dan samakan polanya.

### F11 — Warning ESLint pra-eksisting (Rendah)
- **Bukti:** `packages/ui/src/enterprise/data-grid.tsx:86` — `react-hooks/incompatible-library` (TanStack Table). 0 error.
- **Dampak:** Tidak memblokir CI (warning).
- **Rekomendasi:** Biarkan atau tambahkan disable terarah bila mengganggu.

### F12 — Komentar campur bahasa (Rendah)
- **Bukti:** Banyak komentar Indonesia tersisa (mis. `shared/lib/unsaved-guard.tsx`, `nav-config.ts`). String user-facing sudah Inggris setelah sweep ini.
- **Dampak:** Konsistensi bahasa kode.
- **Rekomendasi:** Sweep komentar terpisah bila diinginkan (risiko rendah).

### F13 — Lokasi migrasi (Info)
- **Bukti:** `infrastructure/database/` hanya berisi `.gitkeep`; migrasi/seed aktual di `apps/api/prisma/`.
- **Rekomendasi:** Hapus folder infra kosong atau dokumentasikan bahwa migrasi dikelola Prisma di `apps/api`.

### F14 — E2E tidak keluar bersih (Info)
- **Bukti:** Menjalankan `concurrency.e2e-spec.ts` → suite lulus, lalu pesan "Jest did not exit one second after the test run has completed" (open handle, kemungkinan koneksi Redis `QueueService`/`CacheService`).
- **Dampak:** `--forceExit` dipakai di script; bukan kegagalan test.
- **Rekomendasi:** Pastikan `onModuleDestroy` menutup Redis, atau andalkan `--forceExit`.

### F15 — ~~Drill-through tabel & chart mouse-only~~ (SELESAI 2026-10-10)
- **Bukti sebelum:** `packages/ui/src/enterprise/data-grid.tsx` — `<tr onClick>` tanpa `tabIndex`/`onKeyDown`; `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx` (`<Scatter onClick>`) juga tidak fokusable.
- **Perbaikan:** baris `DataGrid` dengan `onRowClick` kini `tabIndex={0}` + handler Enter/Space + focus ring; scatter mendapat daftar tombol proyek fokusable sebagai padanan keyboard. Dikirim sebagai PR terpisah (menyentuh `packages/ui`), sesuai rekomendasi.
- **Verifikasi:** `apps/web/src/shared/ui/data-grid-keyboard.test.tsx` (4 test: fokusable, Enter, Space, no-op tanpa handler). Rujukan: `docs/quality/DASHBOARD-UIUX-AUDIT.md` §B (CON-2).

---

## Yang sudah baik (jangan diregresi)

- **Integritas konkurensi:** `withSerializableRetry` + CAS menutup TOCTOU di stok, budget, invoice, approval — diverifikasi `test/concurrency.e2e-spec.ts` (T1, T2, T5, T9, T13).
- **Atomisitas jurnal ↔ status dokumen:** `GlHelper` menerima `tx` pemanggil; kegagalan jurnal membatalkan status (tidak ada dokumen final tanpa jurnal).
- **Guard periode akuntansi:** `shared/utils/period.ts` (Asia/Jakarta) + `assertPeriodOpen` menolak posting ke periode CLOSED/LOCKED.
- **Akun GL wajib hard-fail:** `GL_ACCOUNT_MISSING` (bukan diam-diam tanpa jurnal).
- **Audit trail:** setiap mutasi mencatat `AuditLog`.
- **CI:** lint → test → typecheck → build + docker build check.
