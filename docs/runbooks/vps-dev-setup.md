# Runbook — VPS sebagai Remote Dev Box

Memindahkan environment development dari laptop ke VPS (Ubuntu 24.04).
**Ini bukan setup production.** Tidak ada nginx, TLS, domain, certbot, atau image build —
hanya infra via Docker dan app via `pnpm dev`, persis seperti di laptop.

## Target akhir

```
VPS
├── Docker  : postgres (127.0.0.1:5432), redis (127.0.0.1:6379)
└── tmux    : pnpm dev → api (0.0.0.0:3000) + web (0.0.0.0:5173)

Browser laptop → http://IP_VPS:5173
```

MinIO dan Keycloak **tidak dinyalakan** — belum ada kode yang memakainya
(`apps/api/src` dan `apps/web/src` tidak mereferensikan keduanya). Nyalakan nanti
kalau memang dibutuhkan:

```bash
docker compose -f infrastructure/docker/compose.dev.yml up -d minio keycloak
```

## Prasyarat

| Item | Nilai |
| --- | --- |
| OS | Ubuntu 24.04 |
| Spesifikasi minimum | 2 vCPU / 2 GB RAM / 20 GB disk |
| Spesifikasi teruji | 4 vCPU / 8 GB RAM / 60 GB NVMe |
| Node | 24 (`.nvmrc`) |
| pnpm | 10.33.3 (`packageManager` di `package.json`) |
| PostgreSQL | 16-alpine (dari `compose.dev.yml`) |

---

## 1. Base system

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw tmux
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

`usermod` baru berlaku setelah logout/login. Tutup sesi SSH lalu masuk lagi, atau
jalankan `newgrp docker` untuk sesi berjalan. Verifikasi:

```bash
docker run --rm hello-world
```

## 2. Node 24 + pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm@10.33.3
node -v && pnpm -v    # harapan: v24.x dan 10.33.3
```

Pakai `npm install -g` (bukan `corepack enable`) untuk menghindari error signature
key Corepack pada image Ubuntu baru.

## 3. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 5173/tcp
sudo ufw enable
sudo ufw status
```

Port **3000 sengaja tidak dibuka**. Browser mengakses API lewat proxy Vite di port
5173, jadi tidak perlu. Untuk curl API langsung dari laptop pakai SSH tunnel:

```bash
ssh -L 3000:localhost:3000 user@IP_VPS
```

> **Penting:** `ufw` tidak memfilter port yang dipublikasikan Docker, karena Docker
> menulis aturan iptables sendiri di luar rantai ufw. Proteksi postgres/redis berasal
> dari bind `127.0.0.1` di `compose.dev.yml`, bukan dari firewall.

## 4. Clone & install

```bash
cd ~
git clone https://github.com/nndda-rzn/archipelago-engineering-and-construction-group.git
cd archipelago-engineering-and-construction-group
git checkout develop
pnpm install
```

Repo private? Gunakan Personal Access Token atau deploy key.

## 5. Infra up

```bash
docker compose -f infrastructure/docker/compose.dev.yml up -d postgres redis
docker compose -f infrastructure/docker/compose.dev.yml ps
```

Tunggu sampai postgres dan redis berstatus `healthy` (sekitar 5–10 detik).

## 6. Environment

Buat `apps/api/.env` **di VPS** — file ini tidak pernah di-commit
(`.gitignore` + `.dockerignore` sudah mengecualikannya).

```bash
cat > apps/api/.env <<'EOF'
DATABASE_URL="postgresql://aec:aec_dev_password@localhost:5432/aec_erp"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="GANTI_DENGAN_openssl_rand_hex_32"
SEED_ADMIN_PASSWORD="GANTI_DENGAN_PASSWORD_KUAT"
CORS_ORIGIN="http://IP_VPS:5173"
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
EOF
```

Generate secret baru — jangan pakai nilai dari laptop:

```bash
openssl rand -hex 32
```

Ganti `IP_VPS` dengan IP publik VPS. Kalau `CORS_ORIGIN` salah, browser akan
memblokir request API dengan error CORS.

## 7. Migrate + seed

Database VPS mulai kosong (tidak ada dump dari laptop).

```bash
pnpm --filter @aec/api db:setup
```

Perintah itu menjalankan `prisma migrate deploy` lalu **kedua** seed. Gunakan
`--filter` supaya cwd-nya `apps/api` dan `.env` terbaca; kalau dijalankan dari root
repo, `tsx apps/api/prisma/seed-demo.ts` tidak menemukan `.env` (repo root tidak
punya) dan gagal dengan `DATABASE_URL is required`.

Kenapa dua seed, bukan satu:

| Perintah | Isi |
| --- | --- |
| `db:seed` | Data dasar: user, role, permission, COA, vendor, 1 proyek, WBS |
| `db:seed:demo` | Data demo: 12 proyek, 3 entitas, EVM baseline, workflow 3 versi, tim, jadwal |

`db:seed` saja **tidak** membuat dashboard berisi — portfolio, vendor register,
dan approval inbox akan tampak kosong. `db:seed:demo` butuh `db:seed` sudah jalan.

Keduanya idempoten: aman dijalankan berulang tanpa menggandakan data.

Seed demo sengaja **tidak** dirantai ke `prisma db seed`, karena e2e memakai
perintah itu untuk menyiapkan `aec_test`. Kalau dirantai, budget demo 4,8T di
`PRJ-EPC-2027-014` akan membuat uji `409 BUDGET_EXCEEDED` di
`critical-path.e2e-spec.ts` gagal.

## 8. Jalankan app

```bash
tmux new -s aec
pnpm dev
```

Detach: `Ctrl+B` lalu `D`. Kembali: `tmux attach -t aec`.

`pnpm dev` menjalankan turbo → api (`tsx watch`) dan web (`vite`) bersamaan.

## 9. Verifikasi

Di VPS:

```bash
curl http://localhost:3000/api/v1/health         # {"status":"ok",...}
curl http://localhost:3000/api/v1/health/ready   # {"status":"ok","db":"up",...}
```

`/health/ready` mengembalikan 503 dengan `{"code":"DB_DOWN"}` kalau koneksi database
gagal — periksa `DATABASE_URL` dan status container postgres.

Dari laptop:

```
http://IP_VPS:5173
```

---

## Operasional

### Setelah VPS reboot

Container postgres/redis hidup otomatis (`restart: unless-stopped`), tapi tmux dan
`pnpm dev` tidak. Jalankan ulang:

```bash
cd ~/archipelago-engineering-and-construction-group
docker compose -f infrastructure/docker/compose.dev.yml up -d postgres redis
tmux new -s aec
pnpm dev
```

Kalau ingin otomatis tanpa tmux, ganti dengan systemd unit (`Restart=always`).

### Akses database dari laptop

Prisma Studio atau psql dari laptop:

```bash
ssh -L 5432:localhost:5432 user@IP_VPS
# lalu di laptop: postgresql://aec:aec_dev_password@localhost:5432/aec_erp
```

### Update kode di VPS

```bash
cd ~/archipelago-engineering-and-construction-group
git pull
pnpm install          # hanya kalau lockfile berubah
npx prisma migrate deploy   # hanya kalau ada migration baru
```

`tsx watch` dan Vite hot reload akan menangani sisanya.

### Disk menipis

```bash
docker system df
docker builder prune -f
docker image prune -f
```

### Troubleshooting

| Gejala | Penyebab umum |
| --- | --- |
| `ECONNREFUSED localhost:5432` | Container postgres belum healthy, atau `DATABASE_URL` menunjuk host lain |
| Halaman web terbuka tapi API gagal | `CORS_ORIGIN` tidak cocok dengan origin browser |
| `http://IP_VPS:5173` tidak bisa dibuka | `host: true` hilang di `vite.config.ts`, atau port 5173 belum dibuka di ufw |
| `Blocked request. This host is not allowed` | Diakses lewat nama domain, bukan IP. Tambah `server.allowedHosts: ['domain-anda']` di `vite.config.ts` — akses via IP sudah diizinkan Vite secara default |
| `/health/ready` 503 | Database down atau migration belum jalan |
| `pnpm install` OOM | Tambah swap: `fallocate -l 2G /swapfile` (tidak perlu di 8 GB) |

## Yang sengaja TIDAK dilakukan

Semua ini urusan go-live, bukan dev:

- `compose.prod.yml` (api/web/worker/nginx/certbot)
- Build image & push ke registry
- Domain, TLS, Let's Encrypt
- Worker BullMQ — handler-nya masih template, belum ada produsen job
