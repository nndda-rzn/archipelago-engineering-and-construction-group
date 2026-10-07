# Dashboard "Enterprise Control Tower" — Design Spec

> Design spec. Status: **menunggu tinjauan pengguna**.
> Melanjutkan `2026-10-10-dashboard-control-tower-design.md` (T0–T7 sudah diimplementasi).
> Rencana tugas akan ditulis setelah spec ini disetujui.

---

## 1. Konteks

Dashboard `/` (Control Tower) sudah berjalan dan secara presentasi sudah rapi (responsif,
anti-overlap, palet chart token-derived, live SSE). Namun hasil pemetaan ulang menunjukkan
**lapisan informasi belum maksimal**, dan sebagian akar masalahnya ada di **data**, bukan UI.

Temuan yang membentuk spec ini (semua berbukti kode):

| # | Temuan | Bukti |
|---|---|---|
| 1 | Backend **sengaja mematikan EVM** untuk setiap proyek | `control-tower.service.ts:294-296` → `cpi: null, spi: null, hasEvm: false` |
| 2 | Padahal data EVM tersedia & sudah dihitung service lain | `PortfolioEvmService.portfolioEvm()` (CPI/SPI/EAC/VAC/TCPI) |
| 3 | **Seed hanya 1 proyek** → portfolio/ledger/scatter/ranking degenerasi | `seed-demo.ts` (satu `PRJ`, 4.8T) |
| 4 | Seed **tanpa `ControlAccount`** → `hasEvm=false` di mana-mana | tidak ada `controlAccount.create` di `seed-demo.ts` |
| 5 | Seed **tanpa `Opportunity`** → `commercial.funnel` kosong | tidak ada `opportunity.create` |
| 6 | **`operations.hcm`** di-query tapi tidak dirender | `control-tower.service.ts:522-529` vs `control-tower.tsx` |
| 7 | **`governance.riskMatrix`** di-query tapi tidak dirender | `control-tower.service.ts:538` |
| 8 | **7 angka tampil dua kali** (AR, DSO, FX, NCR, cash, net cash, insiden) | T2↔T4, T4↔T6, T4↔T7 |
| 9 | **T4/T6 = 7 kartu setara** → hierarki datar (anti-pola `no-slop-ui`) | `control-tower.tsx:146-187, 214-241` |
| 10 | Tabel portofolio tanpa drill-through keyboard | `control-tower.tsx:262` (`<table>` tulis-tangan) |

**Diagnosis:** model Prisma sudah cukup untuk semua kebutuhan (multi-entitas, region, currency,
EVM, funnel, risk matrix). Maka perbaikan **tidak butuh migrasi tabel baru** — yang dibutuhkan
adalah **memperkaya seed**, **menghitung EVM di backend**, dan **merender yang selama ini terbuang**.

---

## 2. Tujuan

1. **Data maksimal** — semua angka dashboard nyata, konsisten, dan mengikuti scope entitas.
2. **Sembilan domain terlihat** — finance/liquidity, project, treasury, procurement, HCM, HSE,
   quality, governance, commercial — masing-masing dengan visual yang sesuai fungsinya.
   *(Domain **inventory** belum punya pembacaan di payload Control Tower; ditambahkan hanya bila
   backend menyediakan bloknya — lihat §12. Tidak diklaim sebelum benar-benar ada.)*
3. **Kejelasan data** — setiap angka punya acuan (target atau periode lalu), tidak ada duplikasi,
   setiap visual punya nilai teks pendamping.
4. **Traceable** — setiap angka punya drill-through, dapat dioperasikan keyboard.
5. **Terbaca sebagai satu sistem** — hierarki dari ukuran & jarak, bukan dari mosaik kartu.

## 3. Non-tujuan (di luar lingkup)

- Dark mode, drag-and-drop, widget resize.
- Dashboard per-peran (keputusan: **satu kanvas**, di-scope per entitas — opsi A).
- Notifikasi/langganan/audit "who changed what" (fase berikutnya).
- Menambah tabel/migrasi baru (skema sudah memadai).

---

## 4. Prinsip desain (kriteria "enterprise")

Bukan "banyak widget", melainkan **setiap angka dapat dipercaya dan ditindaklanjuti**.

1. **Scoped** — semua angka mengikuti `entity`/`periode` terpilih. Yang secara definisi snapshot
   (mis. aging) **diberi label** eksplisit, tidak diam-diam.
2. **Ber-acuan** — angka punya pembanding: target (KPI `KpiTarget`) atau delta periode lalu.
3. **Exception-first** — item terlambat/melewati ambang tampil lebih dulu, dengan umur & SLA.
4. **Traceable** — setiap angka punya jalan ke detail; baris/tautan fokusabel (WCAG 2.1.1).
5. **Jujur** — gagal muat → `role="alert"` + retry (bukan "Rp 0"); data kosong ditandai, bukan
   dipaksa nol.

### 4.1 Aturan anti-slop (mengikat, dari `no-slop-ui`)

- **Tidak ada** metric-card grid sebagai tulang punggung halaman.
- **Tidak ada** eyebrow uppercase di mana-mana (label zona normal-case).
- **Tidak ada** pil dekoratif; warna bukan satu-satunya sinyal.
- Tanpa gradien dekoratif, glow, animasi entrance, scale-on-hover.
- Setiap visual punya **nilai teks** pendamping (dapat dibaca tanpa menafsirkan warna).

### 4.2 Aturan pemilihan visual (mengikat, dari `ux-designer/18-data-visualization`)

Encoding dipilih dari **fungsi data**, bukan selera:

| Hubungan data | Visual |
|---|---|
| nilai tunggal vs target | big number + **bullet** |
| tren | **sparkline** / line |
| komposisi (≤5) | **stacked bar** (bukan donut/gauge) |
| dua arah dari nol | **diverging bar** |
| peringkat | **horizontal bar** tersortir |
| tahapan/flow | **bar per tahap** (funnel = area, kalah presisi) |
| dua variabel | **scatter** |
| grid 2D (likelihood×impact) | **heatmap** |

Dilarang: donut, gauge, radar, 3D.

---

## 5. Arsitektur data

### 5.1 Database — perkaya `seed-demo.ts` (tanpa migrasi tabel baru)

Semua model sudah ada. Yang ditambah ke seed:

- **~12 proyek** di **3 `LegalEntity`**, dengan `businessUnit`, `location`, `currency`
  (sebagian non-IDR), `status` bervariasi (PLANNING/ACTIVE/ON_HOLD/COMPLETED).
- Per proyek:
  - `BudgetItem` ber-status **PUBLISHED** (→ BAC).
  - **`ControlAccount`** dengan `plannedValue` (→ PV baseline, sehingga `hasEvm = true`).
  - **`WorkPackageProgress.physicalProgress`** (→ EV = BAC × progress).
  - `VendorInvoice` **POSTED** (→ AC via `ActualCostCalculator`).
  - Variasi disengaja: ada proyek **di bawah anggaran** (CPI>1), **overrun** (CPI<1),
    **tanpa baseline** (NO_BUDGET / `hasEvm=false`) — agar health & scatter bermakna.
- **`Opportunity`** di berbagai `stage` (LEAD→QUALIFIED→PROPOSAL→NEGOTIATION→WON/LOST)
  → mengisi `commercial.funnel`, `winRatePct`, `pipelineValue`.
- `Risk` cukup untuk matriks 5×5 terisi sebagian (likelihood×impact bervariasi).
- `Ncr`/`HseIncident`/`Equipment`/`EquipmentUtilization` tersebar per proyek (bukan satu proyek).

Seed harus **idempoten** (upsert/rekonsiliasi, tidak menggandakan) seperti pola yang sudah ada.

### 5.2 Backend — `control-tower.service.ts`

- **Hitung EVM nyata.** Buang hardcode `cpi:null/spi:null/hasEvm:false` (`:294-296`);
  **reuse `PortfolioEvmService.portfolioEvm(filter)`** untuk mengisi `cpi/spi/hasEvm` per proyek
  di `loadPortfolio()`.
- **Ekspos blok yang sudah di-query tapi dibuang** ke payload `ControlTower`:
  `operations.hcm`, `governance.riskMatrix`, `commercial.funnel` (+ `openOpportunities`,
  `wonValue`, `lostValue`), `treasury.fxExposureByCurrency`.
- Pertahankan cache 45s dan sifat aditif (tanpa param → perilaku lama).

### 5.3 Kontrak — `packages/api-contracts/src/analytics.ts`

- `ControlTowerProject`: `cpi/spi/hasEvm` sudah ada → kini **terisi nyata**.
- Tambah ke `controlTowerSchema` field yang hilang (mis. `commercial.funnel` sudah ada di skema;
  pastikan `governance.riskMatrix` & `operations.hcm` benar-benar dikirim).
- Semua perubahan **aditif** — konsumen lama tidak rusak.

---

## 6. Peta zona final

```
T0  Shell bar      (hapus badge DEMO)
T1  Page header    judul · scope[entity][periode] · Live/Paused
T2  Filter bar     periode · entity · reload · last-updated · chip filter aktif
T3  Position       6 KPI ber-target (bullet attainment + sparkline)     ← teks, bukan kartu
T4  Cash flow (8) ‖ Exception queue (4)                                 ← blok dominan
T5  Portfolio      ledger proyek (tabel, drill-through) · scatter CPI×SPI · EVM bullets
T6  Domain tiles   9 tile visual (lihat §7)                             ← menggantikan T4/T6 lama
T7  Anomaly triage severity bar (konsisten dengan ExceptionQueue)
```

**Hierarki:** dari ukuran & jarak (T4 dominan 8/12; Finance/Delivery > Ops/Governance),
bukan dari border. Tidak ada metric-card grid.

**Aturan anti-menyusut yang baru:** setiap data point yang dirender hari ini tetap ada
(superset), **tetapi** setiap angka hanya boleh muncul **satu kali** (menghapus 7 duplikasi).
Guard test: tidak ada label metrik yang berulang di zona berbeda.

---

## 7. Visual per domain (menggantikan T4/T6 lama)

| Tile | Fungsi data | Visual | Komponen |
|---|---|---|---|
| Liquidity | dua arah dari nol | diverging AR◀▶AP + runway | `DivergingBar` *(ada)* |
| Portfolio health | komposisi | stacked health + count | `StackedBar` *(ada)* |
| Safety | nilai vs ambang | bullet TRIR vs target + hitungan | `BulletBar` *(ada)* |
| Quality | komposisi urgensi | stacked kritis vs biasa + punch | `StackedBar` *(ada)* |
| Procurement | value vs target | bullet open PO + mini stacked PR/RFQ | `BulletBar`/`MiniStackedBar` *(ada)* |
| HCM | tren | sparkline manpower + employees/timesheet/equipment | `Sparkline` *(ada)* |
| Governance | grid 2D | heatmap likelihood×impact 5×5 + hitungan | **`RiskHeatmap` (baru)** |
| Commercial | tahapan | bar per stage LEAD→WON + win rate | **`StageBars` (baru)** |
| Treasury | jatuh tempo | bullet BG vs 30 hari + FX/close | `BulletBar` *(ada)* |

**Hanya 2 komponen baru** (`RiskHeatmap`, `StageBars`) — keduanya karena bentuk datanya
(2D grid, tahapan) tidak terwakili oleh komponen yang ada. Semua sisanya pakai ulang.

**Ledger proyek (T5)** tetap tabel — di sini tabel adalah bentuk yang **benar** (banyak baris,
atribut sama, perlu sortir & drill), bukan template. Ditambah drill-through keyboard.

---

## 8. Komponen

### 8.1 Dipakai ulang (tanpa perubahan API)
`StatTile`, `Sparkline`, `BulletBar`, `MiniStackedBar`, `StackedBar`, `DivergingBar`,
`EvmBars`/`EvmBullets`, `WaterfallChart`, `CashFlowChart`, `ExceptionQueue`, `DataGrid`,
`SectionBand`, `StatusPill`, `DeltaBadge`.

### 8.2 Baru
| Komponen | Lokasi | Tanggung jawab |
|---|---|---|
| `RiskHeatmap` | `packages/ui/src/primitives/risk-heatmap.tsx` | grid 5×5, intensitas = count; `role="img"` + aria-label berisi tiap sel |
| `StageBars` | `packages/ui/src/primitives/stage-bars.tsx` | bar horizontal per tahap, tersortir LEAD→WON; label nilai per bar |

Keduanya: `font-mono tabular-nums`, pendamping non-warna, target sentuh ≥24px.

### 8.3 Dibubarkan
- 7 kartu T4/T6 lama (digantikan 9 tile visual).
- `AnomalyHeader` (dead export) — hapus.
- Badge `DEMO` di `app-shell.tsx` — hapus.
- 6 widget mati (`hero-band`, `liquidity-panel`, `financial-band`, `portfolio-canvas`,
  `signal-rail`, `capital-structure`) — hapus + test-nya. **`portfolio-spine` dipertahankan**
  (dipakai untuk ledger/drill-through); `healthMeta` diekstrak dulu ke `entities/health`.

---

## 9. Penanganan error & state

- Setiap tile/panel: **error-first** — `role="alert"` + retry **sebelum** memformat angka.
- Empty state eksplisit per domain (mis. "No EVM baseline published yet") — bukan nol palsu.
- Loading: skeleton dengan geometri **sama** dengan konten (bukan 3 kolom vs 6 kolom).
- Angka nol → netral (`value-tone.ts`), bukan hijau.

---

## 10. Testing & gate

**API** (`control-tower.service.spec.ts`):
- EVM tidak `null` saat `plannedValue > 0`; `hasEvm` benar.
- Sembilan domain terisi dari seed; zero-data → array/objek valid (bukan `null`).
- Scope `legalEntityId` benar-benar menyaring.

**Web**:
- Tiap tile: render + `role="img"`/aria-label bermakna; ada nilai teks pendamping.
- `RiskHeatmap`, `StageBars`: unit test (data → geometri + aria-label).
- Guard: tidak ada label metrik berulang antar-zona (anti-duplikasi).
- `PortfolioLedger`: baris fokusabel + Enter memicu drill-through.
- Empty/error state tiap tile.

**Gate setiap PR:**
```bash
pnpm typecheck                 # 10/10
pnpm lint                      # 6/6
pnpm --filter @aec/api test:unit
pnpm --filter @aec/web test
```

---

## 11. Pemecahan PR (satu requirement = satu branch, base `develop`)

| PR | Isi | Bergantung pada |
|---|---|---|
| 1 | **Seed**: 12 proyek multi-entitas + ControlAccount + Opportunity + sebaran domain | — |
| 2 | **Backend**: EVM nyata (reuse `PortfolioEvmService`) + ekspos blok terbuang + kontrak | PR 1 |
| 3 | **UI primitives**: `RiskHeatmap`, `StageBars` (+ test) | — |
| 4 | **UI dashboard**: T6 domain tiles, T5 scatter+ledger drill-through, T3 sparkline, hapus duplikasi | PR 2, PR 3 |
| 5 | **Bersih-bersih**: hapus 6 widget mati + badge DEMO + `AnomalyHeader`; ekstrak `healthMeta` | PR 4 |

PR 1–2 (data) dan PR 3 (primitives) dapat berjalan paralel.

---

## 12. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Seed besar memperlambat `db:seed` | Jumlah 12 proyek dibatasi; upsert idempoten; seed hanya untuk demo |
| EVM salah karena `physicalProgress` kosong | Fallback: `hasEvm` tetap `false` bila `pv=0`; tidak pernah `Infinity` |
| Blast radius `packages/ui` | 2 primitif baru berdiri sendiri; guard kontras dipertahankan |
| Duplikasi angka muncul lagi | Guard test anti-duplikasi label |
| Data non-IDR mengacaukan agregasi | Currency ditampilkan apa adanya; konversi FX pakai `FxExposure` yang ada |

---

## 13. Kriteria penerimaan

1. Sembilan domain terlihat, masing-masing dengan visual sesuai fungsi (§7).
2. EVM nyata: scatter CPI×SPI & EVM bullets terisi (tidak semua `null`).
3. Tidak ada angka duplikat antar-zona; setiap angka punya acuan (target/delta).
4. Tidak ada metric-card grid; tidak ada eyebrow uppercase berlebihan.
5. Gagal muat → `role="alert"`; tidak pernah "Rp 0".
6. Semua angka mengikuti scope entitas/periode (snapshot diberi label).
7. Drill-through berfungsi & dapat dioperasikan keyboard.
8. Gate §10 hijau.
