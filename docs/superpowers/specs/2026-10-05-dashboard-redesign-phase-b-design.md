# Dashboard Redesign — Phase B (Financial Intelligence & Visual Coherence)

> Design spec. Status: **approved for implementation** (2026-10-05).
> Bagian dari program multi-fase A→D. Fase A sudah merge (PR #278).

---

## 1. Konteks

Fase A membuat `/` fungsional: 5 zona (Context bar, Signal Rail, Hero, Financial Band, Portfolio
Canvas+Tabel), filter entity/periode di URL, drill-through, dan chart finansial. Yang belum:
kecerdasan finansial (EVM, likuiditas) dan koherensi angka (dua definisi "kas" yang saling
bertentangan).

Fase B menjadikan `/` sebuah **instrumen** — padat, presisi, dan setiap angka punya makna tunggal.

## 2. Prinsip desain

- **Exception-driven monitoring**: dashboard menunjukkan penyimpangan; `/analytics` tetap tempat eksplorasi.
- **Satu angka juara per zona**: hanya satu metrik 40px di layar (Cash on hand).
- **Bentuk > teks**: bullet graph, sparkline, scatter, stacked bar menggantikan kolom angka telanjang.
- **Warna = makna**: racing-red untuk aksi/perhatian; hijau/kuning/merah untuk health; abu untuk netral.
- **Warna tak pernah sendiri**: health/EVM selalu dot/badge + label.
- **Overview → zoom → detail** (Shneiderman).
- **Jujur soal data kosong**: proyek tanpa EVM ditandai, bukan dipaksa 0.

## 3. Keputusan yang mengikat

| Topik | Keputusan |
|---|---|
| Dua definisi kas | Tampilkan **keduanya** dengan label tegas: **Cash on hand** (`/treasury/cash-position` totalBalance) dan **Net cash flow** (analytics `cashIn − cashOut`) |
| EVM vs health | EVM sebagai **indikator tambahan**; `classifyHealth` **tidak** diubah |
| EAC/VAC | **Dihitung** runtime: `EAC = BAC / CPI` (CPI ≤ 0 → BAC), `VAC = BAC − EAC`, `TCPI = (BAC−EV)/(BAC−AC)` |
| Ambisi visual | Perkaya **dalam** design system; tanpa warna/font/radius baru |

## 4. Zona (perubahan dari Fase A)

### Zona 2 — Hero + Liquidity
- **Hero** (kiri): overline `CASH ON HAND · bank balances`; angka `display` mono tabular;
  baris kedua `Net cash flow · period`; narasi; 3 StatCard (Contract, Budget "(baseline)", Actual).
- **Liquidity** (kanan): sparkline burn 3 bulan, **runway** (≈ N bulan), bullet bar AR/AP,
  **working-capital gap** (AR − AP).

### Zona 3 — Financial band
- Cash flow 12 bulan (batang masuk/keluar, grid horizontal saja).
- Aging AR/AP **tersegmentasi** (CURRENT→90+), empty-safe ("No outstanding").
- Budget burn (bullet bar).

### Zona 4 — Portfolio instrument
- **Canvas** (default): sumbu **CPI × SPI**, garis kuadran 1.0/1.0, ukuran titik = nilai kontrak,
  warna = health, titik abu bila tanpa EVM. Klik → proyek.
- **Tabel**: health (dot+label), utilisasi (bullet bar), budget vs aktual (stacked bar),
  variance, revenue, margin (chip), **kolom EVM** (`CPI 1.25 · SPI 0.83`).

### Zona 1 — Signal Rail
- Deep-link **benar-benar menyaring**: `/quality?tab=ncrs&status=OPEN`, `/hse?tab=incidents&status=OPEN`,
  `/quality?tab=punch&status=OPEN`, `/finance/progress-claims?status=DRAFT`.

## 5. API (aditif)

`GET /projects/portfolio/evm?legalEntityId=` → `{ items: PortfolioEvmItem[], totals, generatedAt }`.
Per item: `{ projectId, projectCode, projectName, bac, ev, pv, ac, cpi|null, spi|null, eac, vac, tcpi|null, progressPercent, hasEvm }`.
Tanpa param = seluruh portofolio. Permission `Project.VIEW`.

## 6. Primitif baru

`Sparkline` di `@aec/ui`: SVG inline, `role="img"` + `aria-label` berisi rentang nilai,
aman terhadap < 2 titik dan nilai seragam.

## 7. Kriteria terima

1. Hero menampilkan Cash on hand + Net cash flow + narasi; label tegas.
2. Panel Liquidity menampilkan runway, burn sparkline, AR/AP bar, gap modal kerja.
3. Canvas beralih ke CPI×SPI; proyek tanpa EVM ditandai abu + tooltip "no EVM data".
4. Tabel punya kolom EVM; health lama tidak berubah.
5. `GET /projects/portfolio/evm` mengembalikan rollup; tanpa param = seluruh portofolio.
6. Aging empty-safe; tidak ada bar lebar-nol.
7. Deep-link sinyal menyaring daftar tujuan berdasarkan status.
8. Sisa i18n bersih; `pnpm typecheck`, `pnpm lint`, unit API, dan test web hijau.

## 8. Fase lanjutan (belum dikerjakan)

- **C** — urgensi/SLA inbox, cross-filter linked views, delta periode (MoM/YoY), triage anomali inline.
- **D** — saved views, command palette ⌘K, keyboard-first, ekspor view terfilter.
