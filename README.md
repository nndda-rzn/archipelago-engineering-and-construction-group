# AEC ERP

**Archipelago Engineering & Construction Group — Enterprise Construction & EPC ERP Platform**

AEC ERP adalah platform ERP untuk perusahaan konstruksi/EPC skala besar: multi-company, multi-project, multi-region, multi-currency, multi-business-unit. Project-centric financial and operational backbone.

## Arsitektur

- **Frontend:** React + TypeScript + Vite + TanStack + Tailwind CSS + shadcn/ui (Feature-Sliced Design)
- **Backend:** NestJS + TypeScript — Domain-Oriented Modular Monolith (14 domain)
- **Database:** PostgreSQL (schema per domain) + Redis (BullMQ) + MinIO/S3
- **Identity:** Keycloak
- **Monitoring:** OpenTelemetry + Prometheus + Grafana + Loki + Tempo
- **Monorepo:** pnpm workspace + Turborepo

## Struktur

```text
apps/web        → React SPA
apps/api        → NestJS modular monolith
apps/worker     → BullMQ worker
packages/       → ui, api-contracts, validation, shared-types, config
infrastructure/ → docker, nginx, monitoring, database
docs/           → architecture, prd, business-process, erd, adr
```

## Git Workflow

- `main` → production · `develop` → integrasi · `feature/{FR-xxx}-{slug}` → fitur
- 1 requirement PRD = 1 feature branch (merge commit, no squash)
- PR wajib: review + CI hijau + requirement ID

## Status

- **Fase:** 0 (Engineering Foundation) — dimulai
- Detail lengkap: `docs/prd/` + Obsidian vault (second brain)

## License

Proprietary — AEC Group internal.
