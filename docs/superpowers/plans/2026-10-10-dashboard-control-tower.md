# Dashboard "Control Tower" — Design & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn `/` from a chart-first BI dashboard into an **ERP control tower**: a target-bearing scorecard, an SLA-ranked exception queue, all nine operational domains visible at a glance, live updates, and one-click drill-through — inside the existing AEC design system.

**Architecture:** Additive backend (`KpiTarget` model, `ApprovalTask.dueAt`, a composite `ControlTowerService`, an SSE change-feed). Frontend gains surface/density tokens, five new primitives, a page header, a rebuilt dashboard, an annotated-chart layer, and a live-update layer. No new fonts; colors are re-derived from the existing token ramp (no invented hex).

**Tech Stack:** React 18 + TanStack Query/Router/Table, recharts 3.10, Tailwind token preset, NestJS 10 + Prisma, Redis (pub/sub), Zod, Vitest + RTL, Jest.

**Spec:** `docs/superpowers/specs/2026-10-10-dashboard-control-tower-design.md` (the design spec); this document is the task plan.

**Skills applied:** `frontend-design`, `swiss-design` (12-col grid, 8px unit, opacity hierarchy), `no-slop-ui` (no metric-card grid, no glow/gradient), `hierarchy-spatial` (one dominant block 2–4×), `proximity` (structure from spacing, not borders), `ux-designer/18-data-visualization`, `design-standards`, `vercel-react-best-practices`, `web-design-guidelines`.

---

## Global Constraints

- **Superset, never shrink.** Every data point the dashboard renders today stays. Total ≥ 180 (from 62). A guard test enforces this (Task 9).
- **Design system-first.** No new fonts. New colors are re-derived from existing ramp values, not invented. `chart-colors.ts` mirrors token values.
- **Color rules (binding):** red = action **or** critical only; every meaning has a non-color partner (WCAG 1.4.1); data marks ≥ 3:1 on white (WCAG 1.4.11); ordered ramps are monotonic; max 6 categorical colors; zero is neutral.
- **Hierarchy via opacity**, not different hues (`ink/100 · /70 · /50 · /34`).
- **Structure from spacing, not borders.** Containers only for tables and lists; charts sit on the canvas.
- **All user-facing copy in English**; money/date formatting stays `id-ID`.
- **Numbers render `font-mono tabular-nums`.**
- **Motion:** animate `transform`/`opacity` only; never `transition: all`; honor `prefers-reduced-motion`.
- **Errors first, numbers second.** No widget may format a number before it has handled `isError` (`role="alert"`).
- Web tests `*.test.tsx` beside source (Vitest, `globals:false`); API unit tests `*.spec.ts` beside source.
- Commit after every task. One requirement = one branch, PR base `develop`, merge commit (no squash).

## Review Focus

1. **Failed read must not render `Rp 0`.** Mock `{isError:true}` → `role="alert"` present, `queryByText('Rp 0')` null.
2. **No empty cells in the metric band.** 6 stats × span 2 on a 12-col grid; verify no trailing empty columns at 1440 / 768 / 375.
3. **SSE auth + cleanup.** Stream uses Bearer via `fetch`+`ReadableStream` (not `EventSource`); disconnects on unmount and on `visibilitychange`.
4. **Live animation is compositor-safe.** Only `transform`/`opacity`; disabled under reduced motion.
5. **Information did not shrink.** `renderedMetrics ≥ 180`; no panel silently dropped.
6. **Color contrast.** Green/amber marks ≥ 3:1 on white; aging ramp is monotonic.

---

## Design (spec)

### Aesthetic direction
Light Command Canvas. Calm neutral surfaces (~90%), one accent (racing-red) reserved for action/critical, data meaning carried by the semantic layer. Dense but breathing: spacing does the grouping, not chrome.

### Spatial system (Ledger Grid)
12-column grid, 8px base unit. **20px between blocks, 26px between sections.** Structure from distance. Containers only for the ledger table and the exception/anomaly lists; every chart is full-bleed on the canvas.

```
T0  Shell bar      env · scope · LIVE · 🔔 · ⌘K · help · user
T1  Page header    title + scope + actions + timeline scrubber
T2  Position band  6 stats as text (cash, net flow, backlog, AR 61+, DSO, manpower)
T3  Cash flow (span 8) ‖ Exception queue (span 4)     ← dominant block
T4  Pulse: Portfolio map · Liquidity/WC · Safety·Quality · Procurement (3+3+3+3)
T5  Portfolio ledger (panel) + Cash-bridge waterfall (6) + EVM bullets (6)
T6  Governance · Commercial · Treasury (4+4+4)
T7  Anomaly triage
```

| Tier | Height | Grid | Domain |
|---|---|---|---|
| T2 | ~96px | 6 × span 2 | financial + operational (compact) |
| T3 | ~280px | 8 + 4 | cash + exceptions |
| T4 | ~200px | 3+3+3+3 | project, liquidity, HSE/quality, procurement |
| T5 | ~380px | 12 + 6 + 6 | portfolio + cash bridge + EVM |
| T6 | ~170px | 4+4+4 | governance, commercial, treasury |
| T7 | ~150px | 12 | anomalies |

**Visual proportion:** financial & cash ≈34% · project ≈33% · operational ≈22% · gov/com/treasury ≈11%. All nine domains present; only the weight differs.

### Type scale (from token preset + additions)
`display` 2.5rem (hero only) · **`metric` 1.5rem (NEW, KPI)** · `h1` 1.5rem · `h2` 1rem · `body` 0.875rem · `caption` 0.75rem · `overline` 0.6875rem. All numerals `font-mono tabular-nums`.

### Density tokens (NEW)
`row-compact` 32px · `pad-card` 12px · `gap-cell` 20px · `gap-tier` 26px.

### Color system (4 layers)
```
L1 SURFACE   canvas #f4f4f5 · card #fff · sunken #fafafa · border #e4e4e7 / #d4d4d8
L2 BRAND     action #dc2626 · hover/text #b91c1c          (action only)
L3 SEMANTIC  pos #15803d · warn #b45309 · crit #b91c1c · info #1d4ed8 · neut #71717a
             (fills: #22c55e / #f59e0b / #ef4444 / #3b82f6)
L4 CATEGORY  #2563eb · #d97706 · #0891b2 · #7c3aed · #71717a · #be185d
AGING RAMP   #16a34a → #65a30d → #ca8a04 → #ea580c → #b91c1c  (monotonic)
```

### Real-time (SSE change-feed)
Writes already emit `AuditLog`. Publish a `{topic, at}` event to Redis; expose `GET /analytics/stream` (`text/event-stream`, Bearer via `fetch`+`ReadableStream`); the client calls `queryClient.invalidateQueries(['analytics-*'])`. Push is a **change signal**, not data — no new aggregation logic.

Visual feedback: flash highlight (900ms), count-up (520ms), chart morph (200ms), LIVE dot + "updated Ns ago", "● n new" badge, optional toast, pause on hidden tab, reduced-motion fallback.

### Visual vocabulary (15 devices)
sparkline · bullet bar · ring gauge · severity bar · SLA bar · stacked bar · diverging bar · scatter bubble · **waterfall** · treemap (optional) · **heatmap** · in-cell mini bar · delta pill · radial gauge · **funnel**. Charts carry target line, forecast band, zero line, legend, and unit labels.

---

## Task 1: Schema — `KpiTarget` + `ApprovalTask.dueAt`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<ts>_dashboard_control_tower/migration.sql`
- Modify: `apps/api/prisma/seed-demo.ts`

**Interfaces:**
- Produces: `KpiTarget` model `{ id, legalEntityId?, metric, period, target, direction, createdAt }`, unique `[legalEntityId, metric, period]`; `ApprovalTask.dueAt DateTime?`.

- [ ] Add `model KpiTarget` with the fields above.
- [ ] Add `dueAt DateTime?` to `ApprovalTask` + `@@index([status, dueAt])`.
- [ ] Generate an additive migration; backfill `dueAt = createdAt + interval` for `status='PENDING'` where derivable; leave null otherwise.
- [ ] Seed `KpiTarget` rows (cash.min, budget.utilization, dso.max, safety.trir, equipment.utilization) + demo data for procurement/HSE/HCM/governance/commercial so the dashboard shows real numbers.
- [ ] Verify `prisma migrate up` → `down` → replay; `pnpm --filter @aec/api test:unit`; seed runs clean.

## Task 2: API — `ControlTowerService` + endpoint

**Files:**
- Modify: `packages/api-contracts/src/analytics.ts`
- Create: `apps/api/src/modules/analytics/application/services/control-tower.service.ts`
- Modify: `.../analytics.service.ts`, `.../presentation/controllers/analytics.controller.ts`
- Create: `.../control-tower.service.spec.ts`

**Interfaces:**
- Produces: `controlTowerSchema`; `GET /analytics/control-tower?legalEntityId&from&to` returning `{ kpis[], exceptions{bySeverity,items[]}, financial, project, operations{procurement,hse,quality,hcm}, governance, commercial, treasury, generatedAt }`.
- Consumes: existing `ExecutiveAnalyticsService`, `FinancialAnalyticsService`.

- [ ] Define `controlTowerSchema` (Zod) in `analytics.ts`.
- [ ] Implement `ControlTowerService` as a facade: reuse executive/financial aggregates; add new reads for procurement/HSE/quality/HCM/governance/commercial/treasury + `KpiTarget` attainment.
- [ ] Wire `AnalyticsService.controlTower(filter)` + controller route with `@Permissions(Permission.AnalyticsView)` and a 30–60s cache key.
- [ ] Unit tests: each block returns expected shape; zero-data returns valid empty arrays (never `null`); attainment = value/target with correct direction.
- [ ] Verify API `test:unit` + `typecheck`; smoke endpoint returns 200 with demo data.

## Task 3: Surface & density tokens

**Files:**
- Modify: `packages/config/tailwind/tailwind.preset.cjs`
- Modify: `apps/web/src/styles/globals.css`
- Modify: `apps/web/src/app/layouts/app-shell.tsx`

**Interfaces:**
- Produces: `surface.canvas|raised|sunken`, `border.subtle|strong`, `spacing` density values, `fontSize.metric`.

- [ ] Add `surface` color group + `metric` fontSize + density spacing to the preset (single source of truth).
- [ ] Mirror `--surface-*` in `:root`; set `body` background to canvas.
- [ ] Change `app-shell.tsx` `<main>` `bg-neutral-50` → canvas token.
- [ ] Verify at 1440 / 768 that no core page breaks; `pnpm --filter @aec/web test`.

## Task 4: UI primitives

**Files:**
- Create: `packages/ui/src/primitives/stat-tile.tsx`, `section-band.tsx`, `status-pill.tsx`, `annotated-chart.tsx`
- Create: `packages/ui/src/enterprise/exception-queue.tsx`, `mini-stat.tsx`
- Modify: `packages/ui/src/primitives/card.tsx`, `packages/ui/src/index.ts`

**Interfaces:**
- Produces: `StatTile` (label, value, delta, target attainment, sparkline); `ExceptionQueue` (severity bar + rows with SLA); `SectionBand` (name + rule + right slot); `StatusPill`; `MiniStat`; `AnnotatedChart` (target/forecast/zero/legend/unit); `Card` elevation variants.

- [ ] Build each primitive with `font-mono tabular-nums`, non-color meaning partners, ≥24px targets.
- [ ] `StatTile`: attainment bar + optional sparkline; direction vs meaning handled explicitly.
- [ ] `ExceptionQueue`: segmented severity bar + per-row SLA bar; rows are real buttons/links.
- [ ] `AnnotatedChart`: recharts wrapper injecting `ReferenceLine`/`ReferenceArea`/`Legend`.
- [ ] Unit + a11y tests per primitive.

## Task 5: Shell header + page header

**Files:**
- Modify: `apps/web/src/app/layouts/app-shell.tsx`
- Create: `apps/web/src/widgets/page-header/page-header.tsx` (+ index)
- Create: `apps/web/src/widgets/command-palette/command-palette.tsx`

**Interfaces:**
- Consumes: `usePendingApprovals`, `allNavItems`, `matchNav`.

- [ ] Shell bar: environment badge (`DEMO`), scope chips, notification (`usePendingApprovals` → `/approvals`), `⌘K` trigger, help, user menu.
- [ ] `PageHeader`: title + subtitle + scope + action slot; reused by Dashboard first, then Reporting/Analytics.
- [ ] Command palette: nav-only search over `allNavItems`, keyboard navigable.
- [ ] No dead controls — anything unbuilt is labeled, not silently disabled.
- [ ] Tests for shell + palette.

## Task 6: Canvas composition (Ledger Grid)

**Files:**
- Modify: `apps/web/src/pages/dashboard.page.tsx` (structure only in this task)

**Interfaces:**
- Consumes: `SectionBand`, surface tokens.

- [ ] Lay out T0–T7 as a 12-col grid with 20px block gaps and 26px tier gaps.
- [ ] Make the cash-flow block dominant (span 8) against the exception queue (span 4).
- [ ] Remove per-cell borders; keep containers only for the ledger table and exception/anomaly lists.
- [ ] Add mount reveal (staggered) + hover states, gated on reduced motion.
- [ ] Verify no trailing empty grid cells at 1440 / 768 / 375.

## Task 7: Charts — palette, annotation, cleanup

**Files:**
- Modify: `apps/web/src/widgets/dashboard-charts/chart-colors.ts`, `charts.tsx`, `cash-flow-area.tsx`, `forecast-vs-actual.tsx`, `aging-stacked-bar.tsx`
- Modify: `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx`
- Create: `apps/web/src/shared/lib/chart-format.ts` (`formatIdrAxis`)
- Create: `apps/web/src/widgets/dashboard-charts/waterfall-chart.tsx`, `evm-bullets.tsx`

**Interfaces:**
- Produces: `CHART.gridStrong`; semantic/categorical palettes; `formatIdrAxis`; `WaterfallChart`; `EvmBullets`.

- [ ] Add `gridStrong` + re-derived semantic/categorical palettes; monotonic aging ramp.
- [ ] `formatIdrAxis`: scaled tick with explicit unit label; delete the `jt`/`1e6` formatter.
- [ ] `CashFlowChart`: add `<Legend>`, zero line, target line.
- [ ] `portfolio-canvas`: delete 14 raw hex, data-driven domain, quadrant labels, English empty state.
- [ ] New `WaterfallChart` (cash bridge) + `EvmBullets` (CPI per project vs 1.0).
- [ ] Verify: `grep -c "#[0-9a-f]\{3,8\}" portfolio-canvas.tsx` = 0; `grep 1e6 charts.tsx` = 0; `grep Legend charts.tsx` ≥ 1; `grep "Belum ada"` = 0.

## Task 8: Real-time (SSE change-feed)

**Files:**
- Create: `apps/api/src/modules/analytics/application/services/analytics-stream.service.ts`
- Modify: `apps/api/src/modules/analytics/presentation/controllers/analytics.controller.ts`
- Create: `apps/web/src/shared/lib/stream.ts`, `apps/web/src/features/analytics/model/use-live-analytics.ts`
- Create: `apps/web/src/shared/ui/live-value.tsx`

**Interfaces:**
- Produces: `GET /analytics/stream`; `useLiveAnalytics()`; `LiveValue` (count-up + flash).

- [ ] Publish `{topic, at}` to Redis on AuditLog write (or a dedicated emit point per domain).
- [ ] SSE endpoint: `text/event-stream`, heartbeat 15s, cleanup on disconnect.
- [ ] `stream.ts`: `fetch` + `ReadableStream`, Bearer header, reconnect with backoff; abort on unmount / hidden tab.
- [ ] `useLiveAnalytics`: on event → `queryClient.invalidateQueries(['analytics-*'])`.
- [ ] `LiveValue`: count-up + flash (transform/opacity only), reduced-motion fallback.
- [ ] Toggle Live/Paused in the header.
- [ ] Tests: stream abort on unmount; invalidate called on event; reduced-motion renders no animation.

## Task 9: Assemble Control Tower + data-health contract

**Files:**
- Modify: `apps/web/src/pages/dashboard.page.tsx` and its widgets
- Modify: `apps/web/src/pages/dashboard.page.test.tsx`

**Interfaces:**
- Consumes: everything above.

- [ ] Wire the composite endpoint into T2–T7.
- [ ] Adopt error-first `PanelState` in every widget: render `role="alert"` + retry **before** formatting numbers.
- [ ] Add the `md:` responsive tier; align skeleton geometry to loaded geometry.
- [ ] `tabular-nums` sweep; ≥24px targets; translate the Indonesian empty state.
- [ ] Add the **guard test**: `renderedMetrics >= 180` (count labeled metric nodes).
- [ ] Verify: error mocks show alert + no `Rp 0`; guard test passes.

## Task 10: Drill-through accessibility (shared primitive)

**Files:**
- Modify: `packages/ui/src/enterprise/data-grid.tsx`
- Modify: `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx`

- [ ] `DataGrid` rows: `tabIndex={onRowClick ? 0 : undefined}` + Enter/Space handler.
- [ ] Scatter: focusable point list as an accessible alternative to the canvas.
- [ ] Verify: `getAllByRole('row')[1]` has `tabindex="0"`; Enter invokes `onRowClick`.

---

## Git flow

> CI only runs when the PR base is `develop`/`main`. Do **not** stack PRs.

```
develop ─┬─ feature/dash-ct-00-schema          Task 1
         ├─ feature/dash-ct-01-api             Task 2
         ├─ feature/dash-ct-02-surface-tokens  Task 3
         ├─ feature/dash-ct-03-ui-primitives   Task 4
         ├─ feature/dash-ct-04-shell-header    Task 5
         ├─ feature/dash-ct-05-canvas-bento    Task 6
         ├─ feature/dash-ct-06-charts          Task 7
         ├─ feature/dash-ct-07-realtime        Task 8
         ├─ feature/dash-ct-08-control-tower   Task 9
         └─ feature/dash-ct-09-drill-a11y      Task 10
```

**Order:** `00 → 01`; `02 → 03`; then `04`, `06`, `07`, `09` in parallel; `05`; finally `08`.

## Verification gate (per PR)

```bash
pnpm lint          # 6/6
pnpm typecheck     # 10/10
pnpm --filter @aec/api test:unit
pnpm --filter @aec/web test
# CI: Lint,Typecheck & Build + Docker Build Check + GitGuardian green
```

## Definition of Done

1. `/` = Control Tower T0–T7: 6 stats with targets, SLA-ranked exceptions, all nine domains visible.
2. All nine domains show **valid seeded data**, not zeros.
3. Live: SSE change-feed with flash/count-up/morph/toast and a Live/Paused toggle.
4. Canvas ≠ card is clear; charts annotated and colorblind-safe; no uniform card grid.
5. Errors render `role="alert"`; no misleading `Rp 0`.
6. `docs/DASHBOARD.md` reconciled (drift: `heroNarrative`, `tabel`, `HealthDonut`).

## Out of scope (deliberate)

- Drag-and-drop / widget resize (decision: focus on data interaction).
- Dark mode toggle (possible follow-up phase).
- Full saved views / scheduled export (phase D).
