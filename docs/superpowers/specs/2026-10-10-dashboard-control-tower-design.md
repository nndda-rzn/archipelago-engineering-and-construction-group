# Dashboard "Control Tower" — Design Spec

> Design spec. Status: **approved for implementation** (2026-10-10).
> Melanjutkan redesign fase A (#278) → B (#279) → C (#280) → polish.
> Rencana tugas: `docs/superpowers/plans/2026-10-10-dashboard-control-tower.md`.

---

## 1. Konteks

Dashboard `/` sudah fungsional dan padat analitik, tetapi belum terbaca sebagai **control
surface ERP**. Audit `docs/quality/DASHBOARD-UIUX-AUDIT.md` dan review visual menunjukkan lima
celah struktural:

| # | Celah | Bukti |
|---|---|---|
| 1 | Hierarki datar — semua panel berbobot sama | 8 panel kelas identik `rounded-md border bg-white p-4 shadow-xs` |
| 2 | Tidak ada target/SLA → tidak ada "vs target" | tidak ada model KPI target; `ApprovalTask` tanpa `dueDate` |
| 3 | Fetch gagal tampil "Rp 0" seolah data nyata | `hero-band.tsx:140`, `liquidity-panel.tsx:124`, `financial-band.tsx:144-146` |
| 4 | Satu merah untuk lima makna; hijau/kuning < 3:1 | `tailwind.preset.cjs:14-65`, `chart-colors.ts:8-34` |
| 5 | Tidak real-time (polling 30s); chart tanpa anotasi | `analytics.api.ts:43,82`; `charts.tsx` tanpa legend/target |

## 2. Tujuan

1. **Ringkas & seimbang**: satu pita metrik ber-target yang menjawab "apa posisi kita".
2. **Exception-first**: yang butuh tindakan selalu di atas, dengan umur/SLA.
3. **Seluruh domain terlihat**: 9 domain operasional muncul sekilas, bukan hanya finance+project.
4. **Nyata & hidup**: perubahan terlihat tanpa refresh manual (SSE), angka tidak pernah menyesatkan.
5. **Terbaca sebagai satu sistem**: struktur dari jarak & rule, bukan mosaik kotak.

## 3. Keputusan yang mengikat

| Topik | Keputusan |
|---|---|
| Arah visual | **Light Command Canvas** — kanvas `neutral-100`, kartu putih, satu accent racing-red |
| Layout | **Ledger Grid** — 12 kolom, struktur dari jarak 20px, container hanya untuk tabel & list |
| Warna | **Rombak penuh** — 4 lapis (surface / brand / semantic / categorical) |
| DB/backend | **Aditif penuh** — `KpiTarget`, `ApprovalTask.dueAt`, seed realistis |
| Real-time | **SSE change-feed** (bukan WebSocket), seluruh dashboard |
| Ringkasan | **Pita metrik 6 stat** (bukan 3 kartu hero) |
| Layout personalisasi | **Tidak ada** drag/resize |
| Primitive bersama | **PR terpisah** |

## 4. Zona (T0–T7)

```
T0  Shell bar      env · scope · LIVE · notifikasi · ⌘K · help · user
T1  Page header    judul + scope + aksi + timeline scrubber
T2  Position band  6 stat (cash, net flow, backlog, AR 61+, DSO, manpower) — teks, bukan kartu
T3  Cash flow (8) ‖ Exception queue (4)        ← blok dominan
T4  Pulse: Portfolio map · Liquidity/WC · Safety·Quality · Procurement  (3+3+3+3)
T5  Portfolio ledger + Cash-bridge waterfall + EVM bullets
T6  Governance · Commercial · Treasury (4+4+4)
T7  Anomaly triage
```

**Proporsi visual:** finansial & kas ≈34% · proyek ≈33% · operasional ≈22% ·
governance/commercial/treasury ≈11%. Semua domain ada; hanya bobotnya berbeda.

## 5. Layout (Ledger Grid)

- Grid 12 kolom; **20px antar-blok, 26px antar-section**. Base unit 8px.
- **Struktur dari jarak, bukan border.** Border hanya di panel tabel & list.
- **Hierarki:** satu blok dominan 2–4× blok lain (cash flow 8/12).
- **Rectilinear:** radius 6px (token repo). Tanpa gradien, tanpa glow.
- Responsif: `xl` 12 kolom · `md` blok penuh bertumpuk · `sm` 1 kolom.

**Kontrak anti-menyusut:** superset (62 data point lama tetap); min 5 data point per sel;
tidak ada sel kosong; footer agregat Σ; guard test `renderedMetrics ≥ 180`.

## 6. Sistem warna

```
L1 SURFACE   canvas #f4f4f5 · card #fff · sunken #fafafa · border #e4e4e7 / #d4d4d8
L2 BRAND     action #dc2626 · hover/teks #b91c1c          (HANYA aksi)
L3 SEMANTIC  pos #15803d · warn #b45309 · crit #b91c1c · info #1d4ed8 · neut #71717a
             (fill #22c55e / #f59e0b / #ef4444 / #3b82f6)
L4 CATEGORY  #2563eb · #d97706 · #0891b2 · #7c3aed · #71717a · #be185d
AGING RAMP   #16a34a → #65a30d → #ca8a04 → #ea580c → #b91c1c   (monoton)
```

**Aturan (mengikat):**
1. Merah = aksi **atau** kritis. Bukan kategori, bukan isi bar besar netral.
2. Setiap makna punya pendamping non-warna — WCAG 1.4.1.
3. Mark data ≥ 3:1 pada latar — WCAG 1.4.11.
4. Maks 6 kategori; lebih → "lainnya".
5. Ramp monoton untuk data terurut.
6. Nol = netral (`value-tone.ts` dipertahankan).
7. Hierarki teks via **opacity** (`ink/100 · /70 · /50 · /34`), bukan abu berbeda.

## 7. Tipografi & densitas

Skala: `display` 2.5rem (hero saja) · `metric` 1.5rem (KPI, baru) · `h1` 1.5rem · `h2` 1rem ·
`body` 0.875rem · `caption` 0.75rem · `overline` 0.6875rem. Semua angka `font-mono tabular-nums`.

Densitas: `row-compact` 32px · `pad-card` 12px · `gap-cell` 20px · `gap-tier` 26px.

## 8. Real-time (SSE change-feed)

```
MUTASI → AuditLog (sudah ditulis tiap transisi) → Redis pub/sub
   → GET /analytics/stream (text/event-stream, Bearer via fetch+ReadableStream)
   → client {topic, at} → queryClient.invalidateQueries(['analytics-*']) → refetch
```

**Prinsip:** yang di-push adalah **sinyal perubahan**, bukan angka. Client memakai ulang semua
hook + cache yang ada; tidak ada logika agregasi baru. Event menembus cache 30–60s.

**Umpan balik visual:** flash highlight 900ms · count-up 520ms · morph chart 200ms ·
indikator LIVE + "updated Ns ago" · badge "● n baru" · toast opsional · pause saat tab
tersembunyi · fallback reduced-motion. Animasi hanya `transform`/`opacity`.

## 9. Kosakata visual

sparkline · bullet bar · ring gauge · severity bar · SLA bar · stacked bar · diverging bar ·
scatter bubble · **waterfall** · treemap (opsional) · **heatmap** · in-cell mini bar · delta pill ·
radial gauge · **funnel**. Setiap chart membawa target line, forecast band, zero line, legend,
dan label unit.

## 10. Data & API (aditif)

```prisma
model KpiTarget {
  id            String   @id @default(cuid())
  legalEntityId String?
  metric        String   // "cash.min" | "budget.utilization" | "dso.max" | "safety.trir"
  period        String   // "FY2026" | "2026-Q1"
  target        Decimal
  direction     String   @default("MIN") // MIN | MAX | EXACT
  createdAt     DateTime @default(now())
  @@unique([legalEntityId, metric, period])
}
// ApprovalTask: + dueAt DateTime?  (SLA; backfill dari createdAt + aturan step)
```

```
GET /analytics/control-tower?legalEntityId&from&to
→ { kpis[], exceptions{bySeverity,items[]}, financial, project,
    operations{procurement,hse,quality,hcm}, governance, commercial, treasury, generatedAt }

GET /analytics/stream          (SSE; heartbeat 15s; cleanup saat disconnect)
```

## 11. Kriteria penerimaan

1. Fetch gagal → `role="alert"` + retry; **tidak pernah** "Rp 0".
2. Pita metrik 6 stat tanpa sel kosong pada 1440 / 768 / 375.
3. SSE pakai Bearer via `fetch`+`ReadableStream`; abort saat unmount & tab tersembunyi.
4. Animasi hanya `transform`/`opacity`; mati pada `prefers-reduced-motion`.
5. Informasi tidak menyusut — guard test `renderedMetrics ≥ 180`.
6. Kontras mark ≥ 3:1; ramp aging monoton.
7. `grep -c "#[0-9a-f]\{3,8\}" portfolio-canvas.tsx` = 0; `grep 1e6 charts.tsx` = 0.

## 12. Di luar lingkup

Drag/resize widget · dark mode toggle · saved views & ekspor terjadwal (fase D).

## 13. Aset mockup

| File | Isi |
|---|---|
| `dashboard-mockup.html` | v1 — palet lama |
| `dashboard-mockup-v2.html` | v2 — palet baru, metric band |
| `dashboard-mockup-v3.html` + `mockup-v3-script.js` | v3 — Ledger Grid, hierarki, waterfall, live |
