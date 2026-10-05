# Dashboard Redesign — Phase C (Interaction & Priority)

> Design spec. Status: **approved for implementation** (2026-10-05).
> Fase A (PR #278) dan Fase B (PR #279) sudah merge ke `develop`.

---

## 1. Konteks

Fase A membuat `/` fungsional (5 zona, filter, drill-through). Fase B menambah kecerdasan
finansial (Cash on hand, runway, EVM CPI×SPI, working-capital gap) dan menyelaraskan angka.

Yang masih kurang: dashboard menampilkan **keadaan**, tetapi belum membantu **memprioritaskan**
dan belum bisa **dieksplorasi** tanpa berpindah halaman. Fase C menutup itu.

## 2. Tujuan

1. **Prioritas**: Signal Rail memberi tahu *berapa lama* sebuah hal mengendap (umur dokumen), bukan hanya jumlah.
2. **Eksplorasi**: seleksi pada satu visual menyaring visual lain (cross-filter linked views).
3. **Arah**: setiap KPI menunjukkan delta terhadap periode sebelumnya (MoM/QoQ/YoY).
4. **Tindak lanjut**: anomali bisa ditriase langsung (kelompok per severity, deep-link ke objek).

## 3. Keputusan yang mengikat

| Topik | Keputusan |
|---|---|
| Sumber urgensi | **Endpoint baru** `GET /analytics/signals` → daftar sinyal + `oldestAgeDays`. Logika di satu tempat (backend), Signal Rail hanya merender. |
| Delta periode | **Backend** `GET /analytics/executive?compare=previous` mengembalikan nilai periode ini + periode sebelumnya + delta. Satu query. |
| Cross-filter | **Saring lintas zona penuh**: klik legenda health / titik canvas / bar aging → menyaring KPI + tabel + sinyal. State di URL. Klik ulang = lepas. |

## 4. Zona (perubahan dari Fase B)

### Zona 1 — Signal Rail dengan urgensi
- Setiap chip menampilkan **umur** (`oldestAgeDays`) selain jumlah: mis. `● 2 NCR · oldest 12d`.
- Urutan: severity menurun, lalu **umur menurun**, lalu jumlah.
- Sumber: `GET /analytics/signals` (bukan lagi merakit dari executive).

### Zona 2 — Hero + delta
- Tiap StatCard menampilkan **delta** vs periode sebelumnya: `▲ +12% vs prev` (warna dari token).
- Delta dihitung backend (`compare=previous`), dikembalikan sebagai angka + arah.

### Zona 3 — Financial band dengan seleksi
- Bar aging **dapat diklik** per bucket → menyaring dashboard ke bucket itu.
- Klik ulang melepas.

### Zona 4 — Portfolio dengan cross-filter + triage
- **Legenda health** dapat diklik → menyaring KPI + tabel + sinyal (health terpilih).
- **Titik canvas** mengikuti filter health yang aktif (titik di luar filter diredupkan).
- **Panel triage anomali**: dikelompokkan per severity, tiap item deep-link ke objeknya (proyek/NCR/insiden).

### Zona 0 — Filter bar dengan indikator seleksi aktif
- Menampilkan chip "filter aktif" (mis. `Health: Critical ✕`, `Aging: 90+ ✕`) yang bisa dihapus.

## 5. API (aditif)

### `GET /analytics/signals?legalEntityId=&from=&to=`
```json
{
  "signals": [
    { "key": "ncrs", "severity": "HIGH", "count": 2, "oldestAgeDays": 12, "label": "NCRs", "to": "/quality?tab=ncrs&status=OPEN" },
    { "key": "claims", "severity": "LOW", "count": 5, "oldestAgeDays": 3, "label": "Claims DRAFT", "to": "/finance/progress-claims?status=DRAFT" }
  ],
  "generatedAt": "2026-10-05T00:00:00.000Z"
}
```
- `oldestAgeDays` = umur dokumen tertua (dari `createdAt`) pada sinyal itu; `0` bila tidak relevan.
- Tanpa param = seluruh perusahaan (aditif).

### `GET /analytics/executive?compare=previous`
- Bila `compare=previous`, respons `executive` bertambah blok `previous` (bentuk sama) + `delta`
  (per metrik: `{ current, previous, pctChange, direction }`).
- Tanpa `compare`, bentuk respons **tidak berubah** (kompatibel).

## 6. State URL

`?period=&entity=&health=&bucket=&view=&status=&tab=` — semua dapat dibagikan/di-bookmark.
Seleksi cross-filter (`health`, `bucket`) hidup di URL yang sama dengan filter global.

## 7. Primitif baru

- `DeltaBadge` di `@aec/ui`: `▲ +12%` / `▼ −3%` / `→ 0%` dengan arah + warna token, aksesibel (`aria-label` arah).
- `FilterChip` di `@aec/ui`: label + tombol hapus (✕), aksesibel.

## 8. Kriteria terima

1. Signal Rail menampilkan umur; urutan severity → umur → jumlah.
2. `GET /analytics/signals` mengembalikan daftar sinyal + `oldestAgeDays`; tanpa param = seluruh perusahaan.
3. StatCard menampilkan delta vs periode sebelumnya via `compare=previous`.
4. Klik legenda health / bucket aging menyaring KPI + tabel + sinyal; klik ulang melepas.
5. Chip filter aktif tampil di filter bar dan bisa dihapus.
6. Panel triage anomali mengelompokkan per severity dengan deep-link.
7. Tanpa param baru, endpoint lama berperilaku identik.
8. `pnpm typecheck`, `pnpm lint`, unit API, dan test web hijau.

## 9. Fase lanjutan

- **D — Produktivitas**: saved views, command palette ⌘K, keyboard-first (`j/k`/Enter), ekspor view terfilter.
