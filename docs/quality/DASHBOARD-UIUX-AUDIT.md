# AEC ERP — Dashboard UI/UX Audit (Measurable)

Audit of `apps/web/src/pages/dashboard.page.tsx` and its widgets, performed against external
authoritative guidance. Every finding carries a code citation, a source rule, and a pass/fail
criterion that can be checked with a test or a grep. **No application code was changed by this
document** — see §E for the remediation plan.

Method: five independent audit tracks (accessibility, layout/IA, data visualization, design-system
compliance, engineering/state quality) run in parallel over the same surface, then cross-verified —
each claim re-read against the real file, with unverifiable claims dropped. 11 claims were dropped
by verification (see §G).

---

## A. Measured Facts

All reproducible. Every command was run against the working tree at commit `712a423` (`develop`).

| # | Fact | Command | Result |
|---|---|---|---|
| 1 | Responsive `md:` tokens on the dashboard surface | `grep -rn "md:" apps/web/src/widgets apps/web/src/pages/dashboard.page.tsx` | **0 matches** |
| 2 | Width-aware logic anywhere in web app | `grep -rn "matchMedia\|innerWidth\|useMediaQuery" apps/web/src` | **0 matches** |
| 3 | KPI strip widget exists | `Test-Path apps/web/src/widgets/kpi-strip/kpi-strip.tsx` | **False** |
| 4 | Hardcoded hex literals in `portfolio-canvas.tsx` | `grep -c "#[0-9a-fA-F]\{3,8\}" apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx` | **14** |
| 5 | Connected zones that read `isError`/`onRetry` | `grep -rn "isError\|onRetry" apps/web/src/widgets` | **1 of 6** (`portfolio-spine.tsx:164-165`) |
| 6 | Widget `@aec/ui` import sites that use `Card` | `grep -rn "from '@aec/ui'" apps/web/src/widgets` | **0 of 18** |
| 7 | Dashboard widgets using `ErrorState` or `role="alert"` | `grep -rn 'role="alert"\|ErrorState' apps/web/src/widgets` | **0 matches** |
| 8 | Chart modules exported vs mounted on the dashboard | see §A.1 table | **11 exported, ~5 mounted** |
| 9 | `formatIdr(` lines lacking `tabular-nums` | `grep -n "formatIdr(" apps/web/src/widgets/{financial-band,liquidity-panel}/*.tsx` | **3** |
| 10 | Zones rendered for a full-permission user | `dashboard.page.tsx:66-84` | **6** (4 without `Analytics.VIEW`) |
| 11 | Mobile default portfolio view implemented | fact 2 + `dashboard.page.tsx:24` | **not implemented** |
| 12 | Dashboard charts importing `HEALTH_COLORS` correctly from `chart-colors.ts` | `grep -n "chart-colors" apps/web/src/widgets/dashboard-charts/project-ranking-bar.tsx` | **yes** (`:4`) — proves the shared-colour pattern is understood; `portfolio-canvas.tsx` duplication is a localized defect |
| 13 | `id-ID` number/date locale is a documented house convention, not a defect | `apps/web/src/shared/lib/format.ts:41` | **documented** ("standar bank nasional"); applied in 9 files |
| 14 | `rounded-sm` uses outside the preset radius scale | `grep -n "rounded-sm" apps/web/src/widgets/capital-structure/capital-structure.tsx` | **2** (`:75`, `:77`); preset defines only `DEFAULT`/`md`/`lg` |

### A.1 Chart modules vs actual mounting

`apps/web/src/widgets/dashboard-charts/index.ts` exports 11 modules. Mounted on `/`:

| Module | Chart type | Mounted on dashboard? |
|---|---|---|
| `charts.tsx` → `CashFlowChart` | grouped bar | **yes** (`financial-band.tsx:90`) |
| `aging-stacked-bar.tsx` | stacked horizontal bar | **yes** (`financial-band.tsx:111`) |
| `budget-bullet.tsx` | bullet | **yes** (`financial-band.tsx:131`) |
| `project-ranking-bar.tsx` | horizontal bar | **yes** (`dashboard.page.tsx:45`) |
| `portfolio-canvas` (own file) | scatter CPI×SPI | **yes** (`dashboard.page.tsx:39`) |
| `charts.tsx` → `AgingBar` | stacked bar | no — **dead**, 0 call sites |
| `aging-bucket-bars.tsx` | bar | no |
| `aging-detail-table.tsx` | table | no |
| `budget-usage-bars.tsx` | bar | no |
| `cash-flow-area.tsx` | area + line | no |
| `concentration-bars.tsx` | bar | no |
| `cost-composition-chart.tsx` | donut | no — only `/analytics/reporting` |
| `forecast-vs-actual.tsx` | bar + line | no |

Several built visualization modules are not mounted anywhere on the dashboard.

---

## B. Findings

Severity is evidenced, not editorial. "Verify criterion" is the pass/fail test; every one currently **fails**.

### CON-1 · CRITICAL · A fetch failure renders "Rp 0" as if it were real data

**Evidence**
- `apps/web/src/widgets/hero-band/hero-band.tsx:140` — `const cashOnHand = cashPosition.data?.totalBalance ?? 0;`
- `apps/web/src/widgets/liquidity-panel/liquidity-panel.tsx:124` — `const cashOnHand = cashPosition.data?.totalBalance ?? 0;`
- `apps/web/src/widgets/financial-band/financial-band.tsx:144-146` — `const totals = portfolio.data?.totals; const budget = totals?.totalBudget ?? 0; const actual = totals?.totalActual ?? 0;`
- Only `apps/web/src/widgets/portfolio-spine/portfolio-spine.tsx:164-165` implements `isError={isError}` + `onRetry={() => refetch()}`.
- `ErrorState` already exists at `packages/ui/src/enterprise/state.tsx:47` and is exported (`packages/ui/src/index.ts:38`) but is used by **zero** dashboard widgets (fact A.7).

**Rule violated** — `docs/DASHBOARD.md:179` ("jujur soal data kosong" — be honest about empty data);
Wikipedia *Dashboard (computing)* (citing Eckerson 2010 / Few 2006): dashboards are exception-driven,
and a failed read must be visible. A `0` that means "unknown" is indistinguishable from a real zero,
which is the most dangerous class of defect on a financial control surface.

**Verify criterion (PASS/FAIL)** — Vitest, per widget: mock the data hook as
`{ data: undefined, isLoading: false, isError: true, refetch: vi.fn() }`, render, then assert
`screen.getByRole('alert')` is present and `screen.queryByText('Rp 0')` is `null`.
Currently **FAIL** (no `role="alert"` exists anywhere in `widgets/`).

### CON-2 · HIGH · Drill-through is mouse-only *(deferred — see §E.0)*

**Evidence** — `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx:175-178` (`<Scatter data={points} onClick={...}>`, no `tabIndex`/`onKeyDown`); `packages/ui/src/enterprise/data-grid.tsx:217-222` (`<tr onClick>`, no `tabIndex`/`onKeyDown`), used for drill-through at `portfolio-spine.tsx:166`.

**Rule violated** — WCAG 2.1 SC 2.1.1 Keyboard (Level A).

**Verify criterion** — `getAllByRole('row')[1]` has `tabindex="0"` and Enter invokes `onRowClick`; a focusable control exists for the scatter drill-through. Currently **FAIL**.
**Scope note:** fixing this touches `packages/ui` shared by every list page, so it is recorded as F15 in `docs/quality/FINDINGS.md` and delivered as its own PR.

### CON-3 · HIGH · The responsive contract is documentation only

**Evidence** — doc claims at `docs/DASHBOARD.md:196` ("`768–1279px (md)`: Hero penuh → …") and `:197` ("`<768px (sm)`: … default view = **Tabel**"). Code: **0** `md:` tokens (fact A.1), **0** width-aware calls (fact A.2), and `dashboard.page.tsx:24` hardcodes `useUrlFilter('view', 'canvas')`.
Additionally the loading skeleton assumes a 3-column grid (`hero-band.tsx:84`) that the loaded view never uses (`hero-band.tsx:128`) — skeleton and content have different geometry.

**Rule violated** — Microsoft Fluent / SAP Fiori enterprise density guidance: every breakpoint tier must be defined, and skeleton geometry must match loaded geometry (CLS).

**Verify criterion** — `grep -rn "md:grid-cols" apps/web/src/pages/dashboard.page.tsx apps/web/src/widgets` returns ≥3. Currently **FAIL (0)**.

### CON-4 · MEDIUM · Axis unit abbreviation is internal jargon, and axis/tooltip disagree in unit

> **CORRECTION (round 2).** This finding was originally filed as HIGH "Non-English copy rendered in
> an English UI" and included the `id-ID` locale. Verification against the repo convention proved that
> framing **wrong**; it has been rewritten below. See §G.0 for the reason.

**Evidence**
- `apps/web/src/widgets/dashboard-charts/charts.tsx:18` — ``tickFormatter={(v: number) => `${Math.round(v / 1e6)}jt`}``. This chart is mounted on the dashboard (`financial-band.tsx:90` ← `dashboard.page.tsx:79`).
- The **same chart's** tooltip (`charts.tsx:19`) formats with `formatIdr` → full `Rp 1.234.567` (`shared/lib/format.ts:4`). So one value reads *"12jt"* on the axis and *"Rp 12.000.000"* in the tooltip: the axis uses a **scaled, abbreviated unit**, the tooltip a full currency string, and nothing on the chart explains `jt`.
- Same `jt` formatter at `cash-flow-area.tsx:47` and `forecast-vs-actual.tsx:26` (both currently unmounted — see §A.1).
- `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx:36` — the empty-state message is a full Indonesian sentence in an otherwise English UI.

**Rule violated** — chart axis-labelling rule (`axis-labels`: label axes with units and a readable scale) and NN/g: the reader must not have to decode an unexplained abbreviation. Note the codebase itself uses `jt` as domain shorthand for approval thresholds (`condition-builder.tsx:28`), which is why this is scoped as an **axis-labelling** defect, not a language defect.

**Verify criterion** — `grep -n "1e6" apps/web/src/widgets/dashboard-charts/charts.tsx` returns 0 (replace with a shared formatter plus an axis-title unit). Currently **1 → FAIL**.
`grep -n "Belum ada" apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx` returns 0. Currently **FAIL**.

### CON-5 · HIGH · Single-source-of-truth for chart colour is duplicated, not enforced

**Evidence** — `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx:22-27` re-declares `HEALTH_COLORS` **byte-identical** to `apps/web/src/widgets/dashboard-charts/chart-colors.ts:26-31`:

```
portfolio-canvas.tsx:22-27          chart-colors.ts:26-31
ON_TRACK:  '#22c55e'                ON_TRACK:  '#22c55e'
AT_RISK:   '#f59e0b'                AT_RISK:   '#f59e0b'
CRITICAL:  '#ef4444'                CRITICAL:  '#ef4444'
NO_BUDGET: '#a1a1aa'                NO_BUDGET: '#a1a1aa'
```

Plus 10 further literals at `:100,101,103,104,107,169,170,171,172,173` — 14 total.

**Rule violated** — the repo's own rule, stated twice: `docs/DASHBOARD.md:336` ("tidak boleh menulis hex baru di komponen") and `chart-colors.ts:3` ("jangan tulis hex baru di komponen — impor dari sini").

**Verify criterion** — `grep -c "#[0-9a-fA-F]\{3,8\}" apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx` returns **0**. Currently **14 → FAIL**.
*(Note: `#d4d4d8` = neutral-300 is not yet a key in `chart-colors.ts`, so the fix must add `CHART.gridStrong` with the value copied from `packages/config/tailwind/tailwind.preset.cjs`, not invented.)*

### CON-6 · MEDIUM · `docs/DASHBOARD.md` §2.2 describes a layout the code does not render

**Evidence** (documentation drift — the doc is the contract other engineers navigate by)

| Doc claim | Reality | Evidence |
|---|---|---|
| `:187` hero contains "…+ **3 StatCard**" | hero renders `CapitalStructureChart`; no StatCards | `hero-band.tsx:128`; doc self-contradicts at `:237` |
| `:190` Zone 4 = "PortfolioZone … **+ AnomalyTriage**" | `AnomalyTriage` is a **separate 6th zone** | `dashboard.page.tsx:83` |
| §2.2 lists no ranking zone | a "Worst variance" panel renders | `dashboard.page.tsx:44-45` |
| `:239` narrative by pure fn **`heroNarrative`** | function is `heroFacts`, deliberately carries no currency | `hero-band.tsx:16,122`; `grep heroNarrative` → 0 |
| `:386` lists `HealthDonut` and `AgingBar` | `HealthDonut` absent; `AgingBar` has 0 call sites | `charts.tsx:28`; §A.1 |

**Verify criterion** — `rg "heroNarrative|HealthDonut|3 StatCard" docs/DASHBOARD.md` returns 0 after remediation. Currently **FAIL**.

### CON-7 · MEDIUM · KPI strip (plan Task 9) was never shipped

**Evidence** — `docs/superpowers/plans/2026-10-05-dashboard-polish.md:503` mandates
`apps/web/src/widgets/kpi-strip/kpi-strip.tsx`; the directory does not exist (fact A.3). Plan tasks
9–11 are all unchecked (`:495-509`, `:538-543`). `apps/web/src/pages/dashboard.page.test.tsx:21` mocks
and asserts `ranking` (`:40`) but never `kpi-strip` or `cost-composition`, which the plan's own test
gate at `:497` requires.

**Rule violated** — the plan's own deliverable list; Wikipedia *Dashboard (computing)*: "scorecards: to monitor KPIs and trends" as a first-class dashboard element.

**Verify criterion** — `Test-Path apps/web/src/widgets/kpi-strip/kpi-strip.tsx` returns `True`. Currently **False → FAIL**.

### CON-8 · MEDIUM · The one mounted multi-series chart has no legend

**Evidence** — `apps/web/src/widgets/dashboard-charts/charts.tsx:20-21` renders two coloured series (`cashIn` = `CHART.positive`, `cashOut` = `CHART.negative`) with no `<Legend>` imported (`charts.tsx:1`). A reader must hover a tooltip to learn which colour is which. The correct sibling pattern exists at `forecast-vs-actual.tsx:34` (uses `<Legend>`), but that chart is not mounted.

**Rule violated** — Wikipedia *Dashboard (computing)* (Few 2006; Eckerson 2010): "use of legends anytime more than one color or shape is present on a graph".

**Verify criterion** — `grep -n "Legend" apps/web/src/widgets/dashboard-charts/charts.tsx` returns ≥1. Currently **0 → FAIL**.

### CON-9 · MEDIUM · `view` URL contract drifted; two documented params do not exist

**Evidence** — doc `docs/DASHBOARD.md:330` states `view` ∈ `canvas | tabel`; code implements `table`
(`dashboard.page.tsx:20`) with default `canvas` (`:24`), so a bookmarked `?view=tabel` is a silent
no-op. Doc `:321`/§2.5 documents 7 params (`period, entity, health, bucket, view, status, tab`);
the dashboard actually reads 5 (`dashboard-filter-bar.tsx:31,32,88,89` + `dashboard.page.tsx:24`) —
`status` and `tab` belong to the deep-link *targets* in `signal-rail.tsx:38,41`, not the dashboard.

**Verify criterion** — `rg "tabel" docs/DASHBOARD.md` returns 0 and the documented param count equals the implemented count. Currently **FAIL**.

### CON-10 · MEDIUM · Three financial figures violate the repo's own tabular-numerals rule

**Evidence** — `apps/web/src/widgets/financial-band/financial-band.tsx:109` (`"Receivable · {formatIdr(total(ar))}"`) and `:118` (Payable) render currency with class `text-caption text-neutral-500` — no `font-mono`, no `tabular-nums`; same at `liquidity-panel.tsx:96-97`. Both files *do* comply elsewhere (`financial-band.tsx:54`, `liquidity-panel.tsx:110`), so this is an inconsistency, not a convention.

**Rule violated** — `docs/DASHBOARD.md:147` ("Semua angka di UI: `font-mono tabular-nums`"); also the general rule that data columns use tabular figures to prevent layout shift.

**Verify criterion** — every `formatIdr(` line in those two files also contains `tabular-nums`. Currently **3 → FAIL**.

### CON-11 · WITHDRAWN (round 2) · `id-ID` locale in the filter bar is **correct**, not a defect

> **This finding is withdrawn.** It was filed as LOW on the premise that user-facing copy must be
> English. Verification disproved that premise: `apps/web/src/shared/lib/format.ts:41` documents
> `id-ID` as the *intended* standard ("Format angka & tanggal `id-ID` (standar bank nasional)"), and
> the convention is applied consistently across the app — `treasury-sections.tsx:19`,
> `reporting.page.tsx:43`, `analytics-dashboard.page.tsx:37`, `trial-balance.page.tsx:81`,
> `commercial-eval-table.tsx:26`, `foundation-sections.tsx:26`, `equipment-columns.tsx:33`,
> `equipment-detail.tsx:79`.
>
> `last-updated.tsx:26` therefore follows the house convention and requires **no change**. The
> distinction that survives: **normal prose stays English** (`docs/DASHBOARD.md:145`), while
> **numbers and dates render `id-ID`** (`:147`). See §G.0.

### CON-12 · LOW · `buildSignals` is dead code still shipped and re-exported

**Evidence** — defined at `signal-rail.tsx:31`, re-exported at `signal-rail/index.ts:1`; all other references are in `signal-rail.test.tsx`. Removal was mandated by `2026-10-05-dashboard-polish.md:550`.

**Verify criterion** — `grep -rn "buildSignals" apps/web/src --include=*.ts* | grep -v test` returns 0. Currently **2 → FAIL**.

### CON-13 · LOW · Interactive targets below the 24×24 CSS px minimum

**Evidence** — `financial-band.tsx:54` bucket buttons use `px-1.5 py-0.5 text-caption`. Computed height using preset tokens (`packages/config/tailwind/tailwind.preset.cjs:85` `caption` = 0.75rem = 12px, lineHeight 1.5 → 18px; `:101` `py-0.5` = 2px × 2) = **22px**. `filter-chip.tsx:19-26` remove button has no padding.

**Rule violated** — WCAG 2.1 SC 2.5.8 Target Size (Minimum), Level AA (≥ 24×24 CSS px).

**Verify criterion** — `getByRole('button', { name: '61-90' }).boundingBox().height >= 24`. Currently **22 → FAIL**.

---

## C. Documentation Drift Summary

| Claim in docs | Reality in code | Evidence | Impact |
|---|---|---|---|
| `:336` "all chart colour imported from `chart-colors.ts`; no new hex" | 14 raw hex in `portfolio-canvas.tsx` | CON-5 | flagship chart violates the stated rule |
| `:187` hero = "…+ 3 StatCard" | hero renders `CapitalStructureChart` | `hero-band.tsx:128` | zone inventory wrong; doc contradicts itself at `:237` |
| `:190` Zone 4 includes `AnomalyTriage` | it is a separate 6th zone; ranking panel unlisted | `dashboard.page.tsx:83,44-45` | zone map unusable for navigation |
| `:196-197` `md` tier + mobile default = `Tabel` | no `md:`, no width logic | facts A.1, A.2 | promises a responsive contract that does not exist |
| `:330` `view` = `tabel` | implemented as `table` | `dashboard.page.tsx:20` | bookmarked URLs silently no-op |
| `:321` URL carries `status` & `tab` | dashboard writes 5 params, not 7 | `dashboard-filter-bar.tsx:31,32,88,89` | shareable-state contract false |
| `:239` narrative fn = `heroNarrative` | fn is `heroFacts`, no currency | `hero-band.tsx:16` | wrong name and wrong behaviour |
| `:366` lists `heroNarrative` as tested | not in repo | `grep` → 0 | stale test inventory |
| `:386` lists `HealthDonut`, `AgingBar` | `HealthDonut` absent; `AgingBar` 0 call sites | `charts.tsx:28` | stale symbol inventory |
| `:302` cost-composition donut attributed to dashboard | mounted only on `/analytics/reporting` | `reporting.page.tsx:164` | reader expects a donut on `/` |

---

## D. Enterprise-ERP Gap Summary

The five structural gaps that explain why this surface does not read as an enterprise control
surface. Each is a **contract defect**, not a matter of taste.

**1. No per-widget data-health contract.**
Measured: 1 of 6 connected zones handles `isError` (fact A.5); 0 widgets use the available `ErrorState` primitive (A.7). A failed financial read is rendered as `Rp 0`.
Principle: `docs/DASHBOARD.md:179`; Wikipedia *Dashboard (computing)* (Eckerson) — exception-driven design.
Minimal change: a shared state wrapper mapping `isError|isLoading|data===undefined` → `error|loading|empty|ready`, and every widget must render the error affordance *before* formatting any number.

**2. No defined responsive density tier.**
Measured: 0 `md:` tokens (A.1); 0 width-aware calls (A.2); skeleton geometry ≠ loaded geometry (`hero-band.tsx:84` vs `:128`).
Principle: Fluent / SAP Fiori — every tier specified; skeleton must share geometry with content.
Minimal change: explicit `md:grid-cols-12` + per-zone `md:col-span-*`; align the skeleton grid to the loaded grid.

**3. Charts and grids are not operable without a pointer.**
Measured: `<Scatter onClick>` (`portfolio-canvas.tsx:175`) and `<tr onClick>` (`data-grid.tsx:217`) are the two drill-through paths; neither is focusable.
Principle: WCAG 2.1 SC 2.1.1 (Level A).
Minimal change: focusable control list for the scatter; `tabIndex` + Enter/Space for grid rows. *(Shared primitive → separate PR, §E.0.)*

**4. User-facing copy is not monolingual.**
Measured: an axis renders a scaled abbreviation (`jt`, `charts.tsx:18`) while the **same chart's** tooltip renders a full `Rp 1.234.567` string (`charts.tsx:19`), with no axis title explaining the unit; and one empty state is a full Indonesian sentence (`portfolio-canvas.tsx:36`).
Principle: chart axis-labelling (`axis-labels` — label axes with units and a readable scale); `docs/DASHBOARD.md:145` for prose.
Minimal change: one shared axis formatter that renders a currency-scaled tick with an explicit unit label, used by all three `tickFormatter`s; translate the Indonesian empty state to English. **Locale policy unchanged** — numbers/dates stay `id-ID` per `format.ts:41` (§G.0).

**5. The colour single-source-of-truth is duplicated, not enforced.**
Measured: 14 raw hex in `portfolio-canvas.tsx`, 4 of them byte-identical to `chart-colors.ts` (CON-5).
Principle: `docs/DASHBOARD.md:336`; `chart-colors.ts:3`.
Minimal change: delete the local copies and import; add a guard test that fails the build on any `#rrggbb` under `widgets/**` except `chart-colors.ts`.

**Latent, not a defect:** `usePortfolio` is called from three widgets, but TanStack Query dedupes by `queryKey` — this is a legitimate independent-observer pattern, so it is **not** raised as a finding.

---

## E. Ranked Remediation Plan

### E.0 · Deferred out of scope

- **CON-2** — touches `packages/ui/src/enterprise/data-grid.tsx`, shared by every list page. Recorded as **F15** in `docs/quality/FINDINGS.md`; deliver as its own PR.

### Phase 1 — high leverage, low risk (no structural change)

| # | Change | Closes | Files | Acceptance test |
|---|---|---|---|---|
| 1 | Error state (`role="alert"` + retry) in 5 zones | CON-1 | `hero-band`, `liquidity-panel`, `financial-band`, `signal-rail`, `anomaly-triage` (+ tests) | mock `{isError:true}` → `getByRole('alert')` present, `queryByText('Rp 0')` null, retry calls `refetch` once |
| 2 | Shared axis formatter with a labelled unit (keep `Rp`/`id-ID` per `format.ts:41`); translate the Indonesian empty state | CON-4 | `shared/lib/format.ts`, `charts.tsx:18`, `cash-flow-area.tsx:47`, `forecast-vs-actual.tsx:26`, `portfolio-canvas.tsx:36` | `grep -n "1e6" charts.tsx` → 0; `grep -n "Belum ada" portfolio-canvas.tsx` → 0; unit test for the formatter. **Do NOT change `id-ID` dates** — see §G.0 |
| 3 | Delete duplicated colours; add `CHART.gridStrong` | CON-5 | `chart-colors.ts`, `portfolio-canvas.tsx` | hex count in `portfolio-canvas.tsx` → 0 |
| 4 | Add `<Legend>` to mounted bar chart | CON-8 | `charts.tsx` | `grep -n "Legend" charts.tsx` → ≥1 |
| 5 | `font-mono tabular-nums` on 3 currency sites | CON-10 | `financial-band.tsx:109,118`, `liquidity-panel.tsx:96-97` | every `formatIdr(` line contains `tabular-nums` |
| 6 | Remove `buildSignals` + `SignalInput` | CON-12 | `signal-rail.tsx`, `signal-rail/index.ts`, test | no non-test `buildSignals` references |

Gate: `pnpm --filter @aec/web test` and `pnpm --filter @aec/web typecheck` both green.

### Phase 2 — structural (this is what makes it read as an ERP control surface)

| # | Change | Closes | Files | Acceptance test |
|---|---|---|---|---|
| 7 | Build KPI strip; adopt Z-pattern Z1–Z6; hero keeps ONE champion figure | CON-6, CON-7 | new `widgets/kpi-strip/`, `dashboard.page.tsx`, `hero-band.tsx`, `dashboard.page.test.tsx` | `Test-Path kpi-strip.tsx` → True; page test asserts `kpi-strip`; zone order matches spec `:61-69` |
| 8 | Add `md` responsive tier; align skeleton geometry to content | CON-3 | `dashboard.page.tsx:30,71`, `financial-band.tsx:84`, `hero-band.tsx:84` | `grep -rn "md:grid-cols"` → ≥3 |
| 9 | Width-aware default for `view` | CON-3 | `dashboard.page.tsx:24` + small `useIsNarrow` hook | narrow-viewport test renders `PortfolioSpine` with no `?view=` |
| 10 | Reconcile `view` literal + param list in docs | CON-9 | `docs/DASHBOARD.md:321,330` | no `tabel` literal in the URL contract section |

### Phase 3 — polish

| # | Change | Closes | Acceptance test |
|---|---|---|---|
| 11 | Reconcile `docs/DASHBOARD.md` §2.2/§2.6 fully | CON-6, CON-9 | no `heroNarrative`/`HealthDonut`/`3 StatCard` references |
| 12 | Adopt `Card` primitive for ~8 hand-rolled panels | plan `:467-469` | at least one widget imports `Card` from `@aec/ui` |
| 13 | Raise sub-24px targets (`py-0.5`→`py-1`; filter-chip padding + focus ring) | CON-13 | `boundingBox().height >= 24` |
| 14 | Guard test: no `#rrggbb` under `widgets/**` except `chart-colors.ts`; fix `rounded-sm` in `capital-structure.tsx:75,77` | CON-5 | guard test passes; `rounded-sm` absent from dashboard widgets |

---

## G.0 · Corrections Applied in Round 2

A second verification pass re-read the repo conventions and **overturned two of this audit's own
findings**. They are recorded here rather than silently deleted, so the audit can itself be audited.

| Original finding | Status | Evidence that overturned it |
|---|---|---|
| **CON-4** "Non-English copy rendered in an English UI (HIGH)" — claimed `jt` **and** `id-ID` were both defects | **Rewritten to MEDIUM**, reframed as an axis-labelling defect; the `id-ID` half **removed** | `shared/lib/format.ts:41` documents `id-ID` as intentional ("standar bank nasional"); the convention appears in 9 files across treasury/finance/hcm. `jt` is also used as domain shorthand at `condition-builder.tsx:28`. What survives: an axis using an unexplained scaled abbreviation while its own tooltip uses a full currency string. |
| **CON-11** "`id-ID` locale date in the filter bar (LOW)" | **Withdrawn entirely** | Same evidence. `last-updated.tsx:26` follows the documented house convention; no change is warranted. |

**Lesson recorded:** the repo distinguishes *prose language* (English — `docs/DASHBOARD.md:145`) from
*number/date locale* (`id-ID` — `:147`). An audit that conflates the two produces false positives.
The remaining remediation items were re-scoped accordingly, and the Phase-1 plan item for
"English dates" has been **dropped**.

---

## G. Claims Dropped During Verification

Recorded so the audit is not trusted beyond its evidence.

| Dropped claim | Why |
|---|---|
| "SegmentedControl removes the focus indicator (CRITICAL, SC 2.4.7)" | **False.** `globals.css:138-141` supplies the ring via `box-shadow`; adding `outline-none` on the button does not remove it. |
| "All recharts charts expose no accessible name" | **Partially false.** `portfolio-canvas.tsx:170-171` carries `name="CPI"`/`"SPI"`, `:97` has `role="img"`, and `financial-band.tsx:92-94` gives a text summary. Reduced to the Legend finding (CON-8). |
| "`aria-selected` invalid on `<tr>` (SC 4.1.2)" | Not citable as a hard violation; AT-dependent. The keyboard half is real and kept as CON-2. |
| "0 of 4 recharts wrappers accessible" | Not reproducible — counted two charts that are not mounted. |
| "donut renders on the dashboard (CRITICAL)" | **Mislabelled.** `CostCompositionChart` mounts only at `reporting.page.tsx:164`; 0 donuts on `/`. Kept as drift only. |
| "`max-w-[1600px]` breaks an app-wide 1400px cap" | Counts did not reproduce, and `docs/DASHBOARD.md:195` explicitly endorses 1600px. Informational only. |
| "≈1.8 screens of scroll depth" | Rests on assumed pixel heights that were never rendered. |
| "duplicate `usePortfolio` fetch (MEDIUM)" | Not a defect — TanStack Query dedupes by `queryKey`. |
| "radii outside preset = MEDIUM" | `rounded-full` on 8px dots is a shape, not a scale value. Two `rounded-sm` uses demoted to LOW. |
| "no keyboard path on Scatter = CRITICAL" | Real, but a working table alternative exists (`dashboard.page.tsx:36-37`), so HIGH not CRITICAL. |
| "`jt` is Indonesian at 3 sites" | True, but only `charts.tsx:18` reaches the dashboard. Merged into CON-4. |

---

## H. Verification Limitation

This audit was performed under a read-only file sandbox, so `pnpm --filter @aec/web test` and
`typecheck` were **not executed**; every acceptance criterion above is stated as a command an
engineer can run, not as an observed result. All evidence comes from direct file reads and the greps
listed in §A.

---

## References

- Wikipedia, *Dashboard (computing)* — citing Stephen Few (2006) and Wayne Eckerson (2010): visuals over tables; chart type matched to data; legends when >1 colour or shape; Z-pattern with the most important view top-left; colourblind-friendly palette used consistently and only where necessary. `https://en.wikipedia.org/wiki/Dashboard_(computing)`
- Nielsen Norman Group, Page Laubheimer (2017), *Dashboards: Making Charts and Graphs Easier to Understand* — length and 2D position are preattentive and suited to quantity; area/angle encodings (pie, donut, gauge, radar) are hard to compare accurately; colour is not ordered, so never encode magnitude by colour. `https://www.nngroup.com/articles/dashboards-preattentive/`
- WCAG 2.1 Level AA — 1.4.1 Use of Color; 2.1.1 Keyboard; 2.4.7 Focus Visible; 2.5.8 Target Size (Minimum); 2.3.3 Animation from Interactions.
- Microsoft Fluent Design / SAP Fiori — enterprise data-density guidance: compact density tiers, aligned numeric columns, tabular figures, persistent page header carrying scope.
- In-repo: `docs/DASHBOARD.md`, `docs/superpowers/plans/2026-10-05-dashboard-polish.md`, `packages/config/tailwind/tailwind.preset.cjs`.
