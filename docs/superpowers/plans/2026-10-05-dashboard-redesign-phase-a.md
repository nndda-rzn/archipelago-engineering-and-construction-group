# Dashboard Redesign — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the landing dashboard (`/`) into a functional command center: global entity/period filter, action inbox, editorial hero, financial charts, and a portfolio canvas + table — all inside the existing AEC design system.

**Architecture:** Frontend-heavy. `dashboard.page.tsx` is recomposed into 5 zones built from new widgets in `apps/web/src/widgets/` and new primitives in `packages/ui`. The API gains **optional** query params (`legalEntityId`, `from`, `to`) on existing analytics/portfolio endpoints plus one new `GET /approvals/pending-count`; without params, behaviour is unchanged. Filter state lives in the URL.

**Tech Stack:** React 18 + TanStack Router/Query, Tailwind (token preset in `packages/config`), recharts 3, NestJS 10 + Prisma, Zod (`@aec/api-contracts`), Vitest + Testing Library (web), Jest (api).

**Spec:** `docs/superpowers/specs/2026-10-05-dashboard-redesign-phase-a-design.md`

## Global Constraints

- Design system-first: **no new colors/fonts/radii**. The only new token is `fontSize.display = ['2.5rem', { lineHeight: '1.1', fontWeight: '600' }]`.
- All user-facing copy in **English** (per i18n policy). Money/date formatting stays `id-ID` via `@/shared/lib/format`.
- API params are **optional**; no params ⇒ byte-identical response shape to today.
- Date params are ISO `YYYY-MM-DD`. Validation: `from ≤ to` else `400 INVALID_DATE_RANGE`; span > 5 years else `400 DATE_RANGE_TOO_WIDE`.
- `Budget` KPI is a baseline snapshot: it is **not** period-filtered; UI labels it "(baseline)". Aging is a snapshot: filtered by `legalEntityId` only.
- Cache keys become `${baseKey}:${legalEntityId ?? 'all'}:${from ?? ''}:${to ?? ''}`; `invalidateAnalytics()` must still purge all variants.
- All numbers render `font-mono tabular-nums`. Health is always dot **and** text label, never colour alone.
- Reveal animations are disabled under `prefers-reduced-motion` (already global in `globals.css`).
- Web tests live next to source as `*.test.tsx` (Vitest, `globals: false`, RTL cleanup in `src/test/setup.ts`). API unit tests are `*.spec.ts` next to source.
- Commit after every task. Work on branch `fix/f2-journal-atomic`.

## Review Focus

Inputs/conditions the spec implies but no task's happy-path test covers — each is pinned by a test in the task noted:

1. **A project with `budget = 0`** (NO_BUDGET health) must not divide by zero on the canvas; usage = 0 and tooltip shows "no budget". (Task 10)
2. **A project with `revenue = 0`** must not produce `-Infinity` margin; margin = 0, tooltip "no revenue". (Task 10)
3. **A project present in portfolio but absent from cost summary** must still appear on the canvas (margin 0). (Task 10)
4. **`from > to`** must be rejected by the API with `400 INVALID_DATE_RANGE`, not silently return empty. (Task 5)
5. **All signals zero** must render the "All clear" empty state, not an empty rail. (Task 9)

---

## File Structure

**New — `packages/ui/src/primitives/`**
- `stat-card.tsx` — label + value + context + optional delta.
- `segmented-control.tsx` — single-select radiogroup.
- `signal-chip.tsx` — severity dot + count + label + context (presentational, no router).
- `data-bar.tsx` — `BulletBar` + `MiniStackedBar` (accessible value bars).

**New — `apps/web/src/widgets/`**
- `dashboard-filter-bar/` — period segmented control + entity select + reload + last-updated; URL state.
- `signal-rail/` — builds signal list from executive/aging/anomalies/pending, wraps `SignalChip` in `<Link>`.
- `hero-band/` — net cash figure + narrative + 3 `StatCard`s.
- `financial-band/` — cash flow chart + aging bars + budget burn.
- `portfolio-canvas/` — recharts `ScatterChart` (usage × margin), health legend.
- `portfolio-spine/` — `DataGrid` portfolio table.

**New — `apps/web/src/shared/lib/`**
- `dashboard-period.ts` — pure `resolvePeriod(preset, now)` → `{ from, to }`.

**New — `apps/api/src/shared/utils/`**
- `date-range.ts` — `resolveDateRange(from, to)` with range validation.

**Modified**
- `packages/config/tailwind/tailwind.preset.cjs` — add `display`.
- `packages/ui/src/index.ts` — export new primitives.
- `packages/api-contracts/src/analytics.ts`, `project.ts` — filter schemas + pending-count type.
- `apps/api/src/shared/cache/analytics-cache.ts` — `analyticsCacheKey`.
- `apps/api/src/modules/analytics/...` — filter support.
- `apps/api/src/modules/project/...` — portfolio filter.
- `apps/api/src/modules/approval/...` — `pending-count`.
- `apps/web/src/features/project/model/project.api.ts`, `features/analytics/model/analytics.api.ts` — filter-aware hooks.
- `apps/web/src/widgets/dashboard-charts/charts.tsx` — token restyle + `AgingBar`.
- `apps/web/src/pages/dashboard.page.tsx` — full recompose.
- `apps/web/src/pages/project/project-health.page.tsx` — accept `?project=`.

**Retired**
- `apps/web/src/widgets/dashboard-grid/` (delete).

---

## Task 1: `display` token + `StatCard` primitive

**Files:**
- Modify: `packages/config/tailwind/tailwind.preset.cjs`
- Create: `packages/ui/src/primitives/stat-card.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `apps/web/src/test/stat-card.test.tsx`

**Interfaces:**
- Produces: `StatCard({ label, value, context?, delta?, className? })` where `delta?: { value: string; direction: 'up' | 'down' | 'flat' }`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/test/stat-card.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@aec/ui';

describe('StatCard', () => {
  it('renders label, value and context', () => {
    render(<StatCard label="Budget" value="Rp 1.000" context="82% of budget" />);
    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByText('Rp 1.000')).toBeTruthy();
    expect(screen.getByText('82% of budget')).toBeTruthy();
  });

  it('renders delta with an accessible direction label', () => {
    render(<StatCard label="Cash" value="Rp 5" delta={{ value: '+12%', direction: 'up' }} />);
    expect(screen.getByText('+12%')).toBeTruthy();
    expect(screen.getByLabelText('up')).toBeTruthy();
  });

  it('renders no delta element when delta is absent', () => {
    const { container } = render(<StatCard label="X" value="1" />);
    expect(container.querySelector('[data-slot="stat-delta"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- stat-card`
Expected: FAIL — `StatCard` is not exported from `@aec/ui`.

- [ ] **Step 3: Add the `display` token**

In `packages/config/tailwind/tailwind.preset.cjs`, inside `theme.extend.fontSize`, add after `h1`:

```js
display: ['2.5rem', { lineHeight: '1.1', fontWeight: '600' }],
```

- [ ] **Step 4: Implement `StatCard`**

`packages/ui/src/primitives/stat-card.tsx`: label uses `text-overline uppercase text-neutral-500`; value uses `mt-1 font-mono tabular-nums text-h2 text-neutral-950`; context uses `mt-1 text-caption text-neutral-500`; delta is a `<span data-slot="stat-delta" aria-label={direction}>` showing an arrow glyph (`↑`/`↓`/`→`) plus `value`, coloured `financial-positive-600` / `financial-negative-600` / `neutral-500`. Card container: `rounded-md border border-neutral-200 bg-white p-4 shadow-xs`. Export `StatCard` and `StatCardProps`.

- [ ] **Step 5: Export from the barrel**

In `packages/ui/src/index.ts` add: `export { StatCard, type StatCardProps } from './primitives/stat-card';`

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- stat-card`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/config/tailwind/tailwind.preset.cjs packages/ui/src/primitives/stat-card.tsx packages/ui/src/index.ts apps/web/src/test/stat-card.test.tsx
git commit -m "feat(ui): token display + StatCard primitive"
```

---

## Task 2: `SegmentedControl` primitive

**Files:**
- Create: `packages/ui/src/primitives/segmented-control.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `apps/web/src/test/segmented-control.test.tsx`

**Interfaces:**
- Produces: `SegmentedControl({ options, value, onValueChange, 'aria-label', className? })` where `options: { value: string; label: string }[]`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/test/segmented-control.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SegmentedControl } from '@aec/ui';

const OPTIONS = [
  { value: 'MTD', label: 'MTD' },
  { value: 'QTD', label: 'QTD' },
  { value: 'YTD', label: 'YTD' },
];

describe('SegmentedControl', () => {
  it('exposes a radiogroup with the checked option', () => {
    render(<SegmentedControl aria-label="Period" options={OPTIONS} value="QTD" onValueChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Period' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'QTD' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'MTD' }).getAttribute('aria-checked')).toBe('false');
  });

  it('selects on click', () => {
    const onChange = vi.fn();
    render(<SegmentedControl aria-label="Period" options={OPTIONS} value="MTD" onValueChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'YTD' }));
    expect(onChange).toHaveBeenCalledWith('YTD');
  });

  it('moves selection with arrow keys', () => {
    const onChange = vi.fn();
    render(<SegmentedControl aria-label="Period" options={OPTIONS} value="MTD" onValueChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'MTD' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('QTD');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- segmented-control`
Expected: FAIL — no export.

- [ ] **Step 3: Implement `SegmentedControl`**

Container `role="radiogroup"` with `aria-label` and `inline-flex rounded-md border border-neutral-200 bg-white p-0.5`. Each option a `<button type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1}>`; selected uses `bg-racing-red-600 text-white`, unselected `text-neutral-600 hover:bg-neutral-50`. Keyboard: ArrowRight/ArrowLeft/Home/End move selection by calling `onValueChange` with the neighbour value. Export `SegmentedControl` and its props type.

- [ ] **Step 4: Export from the barrel**

Add `export { SegmentedControl, type SegmentedControlProps } from './primitives/segmented-control';`

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- segmented-control`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/primitives/segmented-control.tsx packages/ui/src/index.ts apps/web/src/test/segmented-control.test.tsx
git commit -m "feat(ui): SegmentedControl primitive (radiogroup)"
```

---

## Task 3: `SignalChip` + `DataBar` primitives

**Files:**
- Create: `packages/ui/src/primitives/signal-chip.tsx`
- Create: `packages/ui/src/primitives/data-bar.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `apps/web/src/test/data-display.test.tsx`

**Interfaces:**
- Produces: `SignalChip({ severity: 'high'|'medium'|'low', count, label, context?, className? })`.
- Produces: `BulletBar({ value, max, label })` and `MiniStackedBar({ primary, secondary, label })`.
- Consumes: nothing (presentational; the rail wraps chips in `<Link>`).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/test/data-display.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignalChip, BulletBar, MiniStackedBar } from '@aec/ui';

describe('SignalChip', () => {
  it('renders count, label and context with a hidden severity dot', () => {
    const { container } = render(<SignalChip severity="high" count={3} label="Anomalies" context="needs review" />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Anomalies')).toBeTruthy();
    expect(screen.getByText('needs review')).toBeTruthy();
    expect(container.querySelector('[data-slot="signal-dot"]')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('BulletBar', () => {
  it('exposes an accessible label with the percentage', () => {
    render(<BulletBar value={68} max={100} label="Utilization" />);
    expect(screen.getByRole('img', { name: /Utilization: 68%/ })).toBeTruthy();
  });

  it('clamps percentage to 100 when value exceeds max', () => {
    render(<BulletBar value={150} max={100} label="Usage" />);
    expect(screen.getByRole('img', { name: /Usage: 100%/ })).toBeTruthy();
  });
});

describe('MiniStackedBar', () => {
  it('exposes both segments in the accessible label', () => {
    render(<MiniStackedBar primary={80} secondary={20} label="Budget vs Actual" />);
    expect(screen.getByRole('img', { name: /Budget vs Actual: 80 \/ 20/ })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- data-display`
Expected: FAIL — no exports.

- [ ] **Step 3: Implement `SignalChip`**

`signal-chip.tsx`: flex container `gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2`. Dot `<span data-slot="signal-dot" aria-hidden="true" class="h-2 w-2 rounded-full ...">` coloured by severity (`destructive-500` / `warning-500` / `info-500`). Count in `font-mono text-h3 tabular-nums text-neutral-950`. Label `text-body-sm text-neutral-700`; context `text-caption text-neutral-500`.

- [ ] **Step 4: Implement `DataBar`**

`data-bar.tsx`: `BulletBar` computes `pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0`; wrapper `role="img" aria-label={\`${label}: ${pct}%\`}` with a track `bg-neutral-100` and a filled `bg-racing-red-600` width `pct%`. `MiniStackedBar` renders two segments sized by `primary/(primary+secondary)` and the remainder, wrapper `role="img" aria-label={\`${label}: ${primary} / ${secondary}\`}`. Both render no text visible (bar only).

- [ ] **Step 5: Export from the barrel**

Add `export { SignalChip, type SignalChipProps, type SignalSeverity } from './primitives/signal-chip';`
and `export { BulletBar, MiniStackedBar } from './primitives/data-bar';`

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- data-display`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/primitives/signal-chip.tsx packages/ui/src/primitives/data-bar.tsx packages/ui/src/index.ts apps/web/src/test/data-display.test.tsx
git commit -m "feat(ui): SignalChip + BulletBar + MiniStackedBar primitives"
```

---

## Task 4: API date-range util + contracts

**Files:**
- Create: `apps/api/src/shared/utils/date-range.ts`
- Create: `apps/api/src/shared/utils/date-range.spec.ts`
- Modify: `packages/api-contracts/src/analytics.ts`
- Modify: `packages/api-contracts/src/project.ts`
- Modify: `packages/api-contracts/src/approval.ts`

**Interfaces:**
- Produces: `resolveDateRange(from?: string, to?: string): { from?: Date; to?: Date }` — throws `BadRequestException` with `code: 'INVALID_DATE_RANGE'` when `from > to`, and `code: 'DATE_RANGE_TOO_WIDE'` when span > 5 years.
- Produces (contracts): `analyticsFilterParamsSchema`, `type AnalyticsFilterParams`, `pendingApprovalCountSchema`, `type PendingApprovalCount`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/shared/utils/date-range.spec.ts
import { BadRequestException } from '@nestjs/common';
import { resolveDateRange } from './date-range';

describe('resolveDateRange', () => {
  it('returns empty object when no bounds given', () => {
    expect(resolveDateRange()).toEqual({});
  });

  it('parses ISO date bounds', () => {
    const r = resolveDateRange('2026-01-01', '2026-03-31');
    expect(r.from?.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(r.to?.toISOString().slice(0, 10)).toBe('2026-03-31');
  });

  it('throws INVALID_DATE_RANGE when from > to', () => {
    expect(() => resolveDateRange('2026-03-01', '2026-01-01')).toThrow(BadRequestException);
    try {
      resolveDateRange('2026-03-01', '2026-01-01');
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toMatchObject({ code: 'INVALID_DATE_RANGE' });
    }
  });

  it('throws DATE_RANGE_TOO_WIDE beyond 5 years', () => {
    try {
      resolveDateRange('2015-01-01', '2026-01-01');
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toMatchObject({ code: 'DATE_RANGE_TOO_WIDE' });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- date-range`
Expected: FAIL — cannot find module `./date-range`.

- [ ] **Step 3: Implement `resolveDateRange`**

`date-range.ts`: parse each provided bound with `new Date(value)`; if both present and `from > to` throw `new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'from must be before to' })`; if span in ms > `5 * 365.25 * 86400000` throw `new BadRequestException({ code: 'DATE_RANGE_TOO_WIDE', message: 'Date range must not exceed 5 years' })`; return `{ from, to }` including only the bounds provided.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- date-range`
Expected: PASS (4 tests).

- [ ] **Step 5: Add contract schemas**

In `packages/api-contracts/src/analytics.ts` append:

```ts
export const analyticsFilterParamsSchema = z.object({
  legalEntityId: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type AnalyticsFilterParams = z.infer<typeof analyticsFilterParamsSchema>;
```

In `packages/api-contracts/src/project.ts` append:

```ts
export const portfolioFilterParamsSchema = z.object({
  legalEntityId: z.string().optional(),
});
export type PortfolioFilterParams = z.infer<typeof portfolioFilterParamsSchema>;
```

In `packages/api-contracts/src/approval.ts` append:

```ts
export const pendingApprovalCountSchema = z.object({ count: z.number() });
export type PendingApprovalCount = z.infer<typeof pendingApprovalCountSchema>;
```

- [ ] **Step 6: Typecheck contracts**

Run: `pnpm --filter @aec/api-contracts typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/shared/utils/date-range.ts apps/api/src/shared/utils/date-range.spec.ts packages/api-contracts/src/analytics.ts packages/api-contracts/src/project.ts packages/api-contracts/src/approval.ts
git commit -m "feat(api): date-range util + filter/pending contracts"
```

---

## Task 5: Cache key helper + analytics service filters

**Files:**
- Modify: `apps/api/src/shared/cache/analytics-cache.ts`
- Modify: `apps/api/src/modules/analytics/application/services/analytics.service.ts`
- Modify: `apps/api/src/modules/analytics/presentation/controllers/analytics.controller.ts`
- Test: `apps/api/src/modules/analytics/application/services/analytics.service.spec.ts` (create)

**Interfaces:**
- Consumes: `resolveDateRange` (Task 4), `analyticsFilterParamsSchema` (Task 4).
- Produces: `analyticsCacheKey(base: string, filter: { legalEntityId?: string; from?: string; to?: string }): string`.
- Produces (service): `executive(filter?)`, `cashFlow(filter?)`, `aging(filter?)` — all accept `{ legalEntityId?: string; from?: string; to?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/analytics/application/services/analytics.service.spec.ts
import { AnalyticsService } from './analytics.service';
import { analyticsCacheKey } from '@/shared/cache/analytics-cache';

describe('analyticsCacheKey', () => {
  it('suffixes with all + empty bounds when no filter', () => {
    expect(analyticsCacheKey('analytics:executive', {})).toBe('analytics:executive:all::');
  });
  it('suffixes with entity and bounds', () => {
    expect(analyticsCacheKey('analytics:executive', { legalEntityId: 'LE1', from: '2026-01-01', to: '2026-03-31' }))
      .toBe('analytics:executive:LE1:2026-01-01:2026-03-31');
  });
});

describe('AnalyticsService.aging filter', () => {
  it('passes legalEntityId into client invoice where-clause', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      clientInvoice: { findMany },
      vendorInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;
    const svc = new AnalyticsService(prisma, cache);
    await svc.aging({ legalEntityId: 'LE1' });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'POSTED', project: { legalEntityId: 'LE1' } }) }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: FAIL — `analyticsCacheKey` not exported; `aging` ignores filter.

- [ ] **Step 3: Add `analyticsCacheKey` + pattern invalidation**

In `apps/api/src/shared/cache/cache.service.ts` add a pattern delete:

```ts
/** Hapus semua key yang cocok dengan pola glob (mis. `analytics:executive:*`). */
async delByPattern(pattern: string): Promise<void> {
  try {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream) {
      if (keys.length > 0) await this.client.del(...(keys as string[]));
    }
  } catch (err) {
    this.logger.warn(`Cache delByPattern fail ${pattern}: ${(err as Error).message}`);
  }
}
```

In `analytics-cache.ts` add:

```ts
export function analyticsCacheKey(
  base: string,
  filter: { legalEntityId?: string; from?: string; to?: string },
): string {
  return `${base}:${filter.legalEntityId ?? 'all'}:${filter.from ?? ''}:${filter.to ?? ''}`;
}
```

Change `invalidateAnalytics` to purge every variant (base key and all suffixed forms):

```ts
export async function invalidateAnalytics(cache: CacheService): Promise<void> {
  await Promise.all(
    ANALYTICS_CACHE_KEY_VALUES.flatMap((key) => [cache.del(key), cache.delByPattern(`${key}:*`)]),
  );
}
```

- [ ] **Step 4: Thread the filter through `executive`, `cashFlow`, `aging`**

In `analytics.service.ts`:
- Change signatures to `async executive(filter: AnalyticsFilterParams = {})`, same for `cashFlow`, `aging`.
- Compute `const { from, to } = resolveDateRange(filter.from, filter.to);` at the top of each.
- Replace each `this.cache.wrap(ANALYTICS_CACHE_KEYS.x, ttl, fn)` with `this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.x, filter), ttl, fn)`.
- `executive`: build `projectWhere = filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {}`; apply to `project.findMany`/`groupBy`. Add a `dateWhere` (`from`/`to`) to `vendorInvoice` (`invoiceDate`), `payment` (`paymentDate`), `collection` (`collectedAt`), `clientInvoice` (`invoiceDate`) aggregations. Leave `budgetItem.aggregate` and operational counts unscoped by date (baseline/snapshot), but scope operational counts by project when `legalEntityId` is set (filter via `project: { legalEntityId }`).
- `cashFlow`: add `project: { legalEntityId }` and `from`/`to` on `collectedAt`/`paymentDate`.
- `aging`: add `project: { legalEntityId }` to both invoice queries.

- [ ] **Step 5: Update the controller**

In `analytics.controller.ts`, import `AnalyticsFilterParams` and accept `@Query() query: AnalyticsFilterParams` on `executive`, `cashFlow`, `aging`; pass `query` to the service. (Leave `anomalies` and `projectCostSummary` unfiltered in Phase A.)

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/shared/cache/cache.service.ts apps/api/src/shared/cache/analytics-cache.ts apps/api/src/modules/analytics/application/services/analytics.service.ts apps/api/src/modules/analytics/application/services/analytics.service.spec.ts apps/api/src/modules/analytics/presentation/controllers/analytics.controller.ts
git commit -m "feat(analytics): optional entity/period filters + cache key"
```

---

## Task 6: Portfolio filter (API)

**Files:**
- Modify: `apps/api/src/modules/project/application/services/portfolio.service.ts`
- Modify: `apps/api/src/modules/project/presentation/controllers/project.controller.ts`
- Test: `apps/api/src/modules/project/application/services/portfolio.service.spec.ts` (create)

**Interfaces:**
- Consumes: `portfolioFilterParamsSchema` (Task 4).
- Produces (service): `portfolio(filter: { legalEntityId?: string } = {})`.
- Produces (controller): `GET /projects/portfolio?legalEntityId=...`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/project/application/services/portfolio.service.spec.ts
import { PortfolioService } from './portfolio.service';

describe('PortfolioService.portfolio filter', () => {
  it('scopes project query by legalEntityId when provided', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { project: { findMany } } as never;
    const actualCost = { computeBatch: jest.fn() } as never;
    const svc = new PortfolioService(prisma, actualCost);
    await svc.portfolio({ legalEntityId: 'LE1' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { legalEntityId: 'LE1' } }));
  });

  it('omits where when no filter', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { project: { findMany } } as never;
    const svc = new PortfolioService(prisma, { computeBatch: jest.fn() } as never);
    await svc.portfolio();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- portfolio.service`
Expected: FAIL — `portfolio()` takes no argument / no `where`.

- [ ] **Step 3: Implement the filter**

In `portfolio.service.ts`, change signature to `async portfolio(filter: { legalEntityId?: string } = {})` and pass `where: filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {}` to `project.findMany`. Nothing else changes (empty-result branch already returns zeroed totals).

- [ ] **Step 4: Wire the controller**

In `project.controller.ts`, change `portfolio()` to `portfolio(@Query() query: PortfolioFilterParams)` importing the type from `@aec/api-contracts`; pass `query` to `this.portfolioSvc.portfolio(query)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- portfolio.service`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/project/application/services/portfolio.service.ts apps/api/src/modules/project/application/services/portfolio.service.spec.ts apps/api/src/modules/project/presentation/controllers/project.controller.ts
git commit -m "feat(project): portfolio filter by legal entity"
```

---

## Task 7: `GET /approvals/pending-count` (API)

**Files:**
- Modify: `apps/api/src/modules/approval/application/services/approval-task.service.ts`
- Modify: `apps/api/src/modules/approval/presentation/controllers/approval.controller.ts`
- Test: `apps/api/src/modules/approval/application/services/approval-task.service.spec.ts` (create)

**Interfaces:**
- Consumes: `pendingApprovalCountSchema` (Task 4).
- Produces (service): `pendingCount(): Promise<number>`.
- Produces (controller): `GET /approvals/pending-count` → `{ count: number }`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/approval/application/services/approval-task.service.spec.ts
import { ApprovalTaskService } from './approval-task.service';

describe('ApprovalTaskService.pendingCount', () => {
  it('counts PENDING approval tasks', async () => {
    const count = jest.fn().mockResolvedValue(4);
    const prisma = { approvalTask: { count } } as never;
    const svc = new ApprovalTaskService(prisma, {} as never, {} as never);
    await expect(svc.pendingCount()).resolves.toBe(4);
    expect(count).toHaveBeenCalledWith({ where: { status: 'PENDING' } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- approval-task.service`
Expected: FAIL — `pendingCount` is not a function.

- [ ] **Step 3: Implement `pendingCount`**

In `approval-task.service.ts` add:

```ts
async pendingCount(): Promise<number> {
  return this.prisma.approvalTask.count({ where: { status: 'PENDING' } });
}
```

- [ ] **Step 4: Wire the controller**

In `approval.controller.ts` add, above `@Get('workflows')`:

```ts
@Get('pending-count')
@Permissions(Permission.ApprovalView)
async pendingCount() {
  return { count: await this.task.pendingCount() };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- approval-task.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/approval/application/services/approval-task.service.ts apps/api/src/modules/approval/application/services/approval-task.service.spec.ts apps/api/src/modules/approval/presentation/controllers/approval.controller.ts
git commit -m "feat(approval): pending-count endpoint"
```

---

## Task 8: Web period util + filter-aware hooks

**Files:**
- Create: `apps/web/src/shared/lib/dashboard-period.ts`
- Test: `apps/web/src/shared/lib/dashboard-period.test.ts`
- Modify: `apps/web/src/features/project/model/project.api.ts`
- Modify: `apps/web/src/features/analytics/model/analytics.api.ts`
- Modify: `apps/web/src/features/approval/model/approval-task.api.ts`

**Interfaces:**
- Produces: `type PeriodPreset = 'MTD' | 'QTD' | 'YTD' | '12M' | 'CUSTOM'`; `resolvePeriod(preset: PeriodPreset, now: Date, custom?: { from?: string; to?: string }): { from?: string; to?: string }` returning ISO `YYYY-MM-DD`.
- Produces: `type DashboardFilter = { legalEntityId?: string; from?: string; to?: string }`.
- Produces: `usePortfolio(filter?: DashboardFilter)`, `useExecutiveDashboard(filter?: DashboardFilter)`, `useCashFlow(filter?: DashboardFilter)`, `useAging(filter?: DashboardFilter)`, `usePendingApprovals()`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/shared/lib/dashboard-period.test.ts
import { describe, expect, it } from 'vitest';
import { resolvePeriod } from './dashboard-period';

const NOW = new Date('2026-05-15T00:00:00.000Z');

describe('resolvePeriod', () => {
  it('MTD starts on the first of the month', () => {
    expect(resolvePeriod('MTD', NOW)).toEqual({ from: '2026-05-01', to: '2026-05-15' });
  });
  it('QTD starts on the quarter first day', () => {
    expect(resolvePeriod('QTD', NOW)).toEqual({ from: '2026-04-01', to: '2026-05-15' });
  });
  it('YTD starts on Jan 1', () => {
    expect(resolvePeriod('YTD', NOW)).toEqual({ from: '2026-01-01', to: '2026-05-15' });
  });
  it('12M starts 12 months back', () => {
    expect(resolvePeriod('12M', NOW)).toEqual({ from: '2025-05-15', to: '2026-05-15' });
  });
  it('CUSTOM passes through provided bounds', () => {
    expect(resolvePeriod('CUSTOM', NOW, { from: '2026-01-01', to: '2026-02-01' }))
      .toEqual({ from: '2026-01-01', to: '2026-02-01' });
  });
  it('CUSTOM with no bounds returns empty', () => {
    expect(resolvePeriod('CUSTOM', NOW)).toEqual({ from: undefined, to: undefined });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- dashboard-period`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `resolvePeriod`**

`dashboard-period.ts`: format a `Date` to `YYYY-MM-DD` via `toISOString().slice(0, 10)`. `MTD` → first of month; `QTD` → first day of `Math.floor(month/3)*3`; `YTD` → Jan 1; `12M` → same day 12 months earlier; `CUSTOM` → the provided `from`/`to`. `to` is always `now` for the four presets.

- [ ] **Step 4: Make hooks filter-aware**

`project.api.ts`: `usePortfolio(filter: DashboardFilter = {})` → build query string from `filter`, `queryKey: [...projectAnalyticsKeys.portfolio(), filter]`.
`analytics.api.ts`: `useExecutiveDashboard(filter: DashboardFilter = {})`, `useCashFlow(filter = {})`, `useAging(filter = {})` → append filter params, include `filter` in each `queryKey`. Add:

```ts
export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending-count'] as const,
    queryFn: async () => pendingApprovalCountSchema.parse(await getJson<unknown>('/approvals/pending-count')),
    refetchInterval: 30000,
  });
}
```

Import `pendingApprovalCountSchema` from `@aec/api-contracts` and `DashboardFilter` from `@/shared/lib/dashboard-period`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @aec/web test -- dashboard-period`
Expected: PASS (6 tests). Then `pnpm --filter @aec/web typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/shared/lib/dashboard-period.ts apps/web/src/shared/lib/dashboard-period.test.ts apps/web/src/features/project/model/project.api.ts apps/web/src/features/analytics/model/analytics.api.ts apps/web/src/features/approval/model/approval-task.api.ts
git commit -m "feat(web): period util + filter-aware dashboard hooks"
```

---

## Task 9: Signal Rail widget

**Files:**
- Create: `apps/web/src/widgets/signal-rail/signal-rail.tsx`
- Create: `apps/web/src/widgets/signal-rail/index.ts`
- Test: `apps/web/src/widgets/signal-rail/signal-rail.test.tsx`

**Interfaces:**
- Consumes: `SignalChip` (Task 3); `useExecutiveDashboard`, `useAging`, `useAnomalies`, `usePendingApprovals` (Task 8).
- Produces: `SignalRail()` — no props; reads the filter-aware hooks. Also exports pure `buildSignals(input): Signal[]` where `Signal = { key; severity: 'high'|'medium'|'low'; count; label; context; to }`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/signal-rail/signal-rail.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildSignals, SignalRailView } from './signal-rail';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const base = {
  openNcrs: 2, openIncidents: 1, overduePm: 0, openPunchItems: 0, openClaims: 5,
  pendingApprovals: 2, overdueAr: 0, anomalies: { high: 3, medium: 0, low: 0 },
};

describe('buildSignals', () => {
  it('drops zero-count signals', () => {
    const keys = buildSignals(base).map((s) => s.key);
    expect(keys).not.toContain('pm');
    expect(keys).not.toContain('punch');
  });

  it('orders by severity then count', () => {
    const sig = buildSignals(base);
    expect(sig[0]!.severity).toBe('high'); // anomalies high=3
    expect(sig[0]!.key).toBe('anomalies');
  });

  it('deep-links carry filter params', () => {
    const ncrs = buildSignals(base).find((s) => s.key === 'ncrs')!;
    expect(ncrs.to).toBe('/quality?tab=ncrs');
  });
});

describe('SignalRail empty state', () => {
  it('renders all-clear when every signal is zero', () => {
    const zero = { ...base, openNcrs: 0, openIncidents: 0, openClaims: 0, pendingApprovals: 0, anomalies: { high: 0, medium: 0, low: 0 } };
    render(<SignalRailView signals={buildSignals(zero)} />);
    expect(screen.getByText(/all clear/i)).toBeTruthy();
  });
});
```

`SignalRailView({ signals })` is the presentational component exported from the widget, so the empty-state branch is testable without mocking queries. `SignalRail` is the connected wrapper that reads hooks and renders `SignalRailView`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- signal-rail`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `buildSignals` + `SignalRailView` + `SignalRail`**

`buildSignals(input)` maps each non-zero source to a `Signal`, then sorts by severity rank (high=0, medium=1, low=2) then count desc. Deep-links: anomalies→`/analytics`, ncrs→`/quality?tab=ncrs`, incidents→`/hse?tab=incidents`, pm→`/hcm/equipment`, punch→`/quality?tab=punch`, claims→`/finance/progress-claims`, approvals→`/approvals`, overdueAr→`/finance/client-invoices`.

`SignalRailView({ signals })`: if `signals.length === 0` render `<EmptyState title="All clear" description="No open signals." />`; else a `flex flex-wrap gap-2` of `<Link to={s.to}><SignalChip .../></Link>` (TanStack `Link`).

`SignalRail()`: calls the four hooks, computes `anomalies` counts by severity from `useAnomalies().data`, `overdueAr` from `useAging().data` (sum buckets `61-90` + `90+`), and renders `SignalRailView`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- signal-rail`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/signal-rail/
git commit -m "feat(web): Signal Rail widget (action inbox)"
```

---

## Task 10: Portfolio Canvas widget

**Files:**
- Create: `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx`
- Create: `apps/web/src/widgets/portfolio-canvas/index.ts`
- Test: `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.test.tsx`

**Interfaces:**
- Consumes: `usePortfolio(filter)` (Task 8), `useProjectCostSummary()`.
- Produces: `buildCanvasPoints(portfolioItems, costItems): CanvasPoint[]` where `CanvasPoint = { projectId; projectCode; projectName; usage; margin; contract; health; hasBudget: boolean; hasRevenue: boolean }`.
- Produces: `PortfolioCanvas({ filter })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/portfolio-canvas/portfolio-canvas.test.tsx
import { describe, expect, it } from 'vitest';
import { buildCanvasPoints } from './portfolio-canvas';

const items = [
  { projectId: 'p1', projectCode: 'PRJ-1', projectName: 'A', client: 'C', status: 'ACTIVE', contractValue: 100, budget: 0, actual: 0, revenue: 0, variance: 0, utilization: null, health: 'NO_BUDGET' as const },
  { projectId: 'p2', projectCode: 'PRJ-2', projectName: 'B', client: 'C', status: 'ACTIVE', contractValue: 200, budget: 100, actual: 120, revenue: 0, variance: -20, utilization: 120, health: 'CRITICAL' as const },
];
const costs = [{ projectCode: 'PRJ-2', projectName: 'B', contractValue: 200, budget: 100, cost: 120, revenue: 0, margin: 0, budgetUsagePct: 120 }];

describe('buildCanvasPoints', () => {
  it('does not divide by zero for a no-budget project', () => {
    const p = buildCanvasPoints(items, costs).find((x) => x.projectCode === 'PRJ-1')!;
    expect(p.usage).toBe(0);
    expect(p.hasBudget).toBe(false);
    expect(Number.isFinite(p.usage)).toBe(true);
  });

  it('does not produce -Infinity margin when revenue is zero', () => {
    const p = buildCanvasPoints(items, costs).find((x) => x.projectCode === 'PRJ-2')!;
    expect(p.margin).toBe(0);
    expect(p.hasRevenue).toBe(false);
    expect(Number.isFinite(p.margin)).toBe(true);
  });

  it('keeps projects absent from cost summary (margin 0)', () => {
    const p = buildCanvasPoints(items, []).find((x) => x.projectCode === 'PRJ-1')!;
    expect(p.margin).toBe(0);
    expect(p.hasRevenue).toBe(false);
  });

  it('computes usage percentage from budget and actual', () => {
    const p = buildCanvasPoints(items, costs).find((x) => x.projectCode === 'PRJ-2')!;
    expect(p.usage).toBe(120);
    expect(p.hasBudget).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- portfolio-canvas`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `buildCanvasPoints`**

Join by `projectCode`. `usage = budget > 0 ? Math.round((actual / budget) * 1000) / 10 : 0`, `hasBudget = budget > 0`. `margin = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : 0`, `hasRevenue = revenue > 0`; take `revenue`/`cost` from the cost-summary item if present, else 0. `contract = contractValue`. Preserve `health`.

- [ ] **Step 4: Implement `PortfolioCanvas`**

recharts `ScatterChart` inside `ResponsiveContainer height={280}`. `<XAxis type="number" dataKey="usage" name="Budget usage %" />`, `<YAxis type="number" dataKey="margin" name="Margin %" />`. `<ReferenceLine x={100} />` and `<ReferenceLine y={0} />` (`stroke="#e4e4e7"`). One `<Scatter>` with `<Cell fill={HEALTH_COLORS[p.health]}>` per point (`project-on-track-500 #22c55e`, `at-risk #f59e0b`, `critical #ef4444`, `no-budget #a1a1aa`). Tooltip shows code, usage%, margin%, contract (via `formatIdr`), and "no budget"/"no revenue" notes when flags are false. Click a point → `navigate({ to: '/project-health', search: { project: p.projectId } })`. Below the chart, a health legend (dot + label per health). Export `PortfolioCanvas` and `buildCanvasPoints`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- portfolio-canvas`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/widgets/portfolio-canvas/
git commit -m "feat(web): Portfolio Canvas widget (usage x margin scatter)"
```

---

## Task 11: Portfolio Spine widget

**Files:**
- Create: `apps/web/src/widgets/portfolio-spine/portfolio-spine.tsx`
- Create: `apps/web/src/widgets/portfolio-spine/index.ts`
- Test: `apps/web/src/widgets/portfolio-spine/portfolio-spine.test.tsx`

**Interfaces:**
- Consumes: `usePortfolio(filter)` (Task 8), `BulletBar`, `MiniStackedBar`, `Badge` (Task 3), `DataGrid`, `healthMeta`.
- Produces: `portfolioColumns` (TanStack `ColumnDef<Portfolio['items'][number]>[]`).
- Produces: `PortfolioSpine({ filter })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/portfolio-spine/portfolio-spine.test.tsx
import { describe, expect, it } from 'vitest';
import { portfolioColumns } from './portfolio-spine';

describe('portfolioColumns', () => {
  it('includes health, utilization, budget-vs-actual, variance, revenue and margin columns', () => {
    const ids = portfolioColumns.map((c) => (c as { id?: string; accessorKey?: string }).id ?? (c as { accessorKey?: string }).accessorKey);
    for (const key of ['projectCode', 'client', 'health', 'utilization', 'budgetVsActual', 'variance', 'revenue', 'margin']) {
      expect(ids).toContain(key);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- portfolio-spine`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `portfolioColumns` + `PortfolioSpine`**

`portfolioColumns`: use `createColumnHelper<Portfolio['items'][number]>()`. Columns: `projectCode` (mono + name), `client`, `health` (`Badge` from `healthMeta`), `utilization` (`BulletBar value={utilization ?? 0} max={100} label="Utilization"`), `budgetVsActual` id with `MiniStackedBar primary={actual} secondary={Math.max(0, budget - actual)} label="Budget vs Actual"`, `variance` (`formatIdr`, coloured by sign), `revenue` (`formatIdr`), `margin` id = `revenue > 0 ? (revenue - actual)/revenue*100 : 0` as a chip. `PortfolioSpine({ filter })`: `usePortfolio(filter)`, render `DataGrid` with `onRowClick` → `navigate({ to: '/project-health', search: { project: row.original.projectId } })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- portfolio-spine`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/portfolio-spine/
git commit -m "feat(web): Portfolio Spine widget (rich table)"
```

---

## Task 12: Hero Band widget

**Files:**
- Create: `apps/web/src/widgets/hero-band/hero-band.tsx`
- Create: `apps/web/src/widgets/hero-band/index.ts`
- Test: `apps/web/src/widgets/hero-band/hero-band.test.tsx`

**Interfaces:**
- Consumes: `StatCard` (Task 1), `useExecutiveDashboard`, `usePortfolio` (Task 8), `formatIdr`.
- Produces: `heroNarrative(input): string` (pure); `HeroBand({ filter })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/hero-band/hero-band.test.tsx
import { describe, expect, it } from 'vitest';
import { heroNarrative } from './hero-band';

describe('heroNarrative', () => {
  it('summarizes net cash, critical projects and open NCRs', () => {
    const text = heroNarrative({ netCash: 1240500000, criticalProjects: 3, openNcrs: 2 });
    expect(text).toMatch(/positive/i);
    expect(text).toContain('3');
    expect(text).toContain('2');
  });

  it('says negative when net cash is below zero', () => {
    expect(heroNarrative({ netCash: -5, criticalProjects: 0, openNcrs: 0 })).toMatch(/negative/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- hero-band`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `heroNarrative` + `HeroBand`**

`heroNarrative({ netCash, criticalProjects, openNcrs })` → `Cash net ${netCash >= 0 ? 'positive' : 'negative'}; ${criticalProjects} critical project(s); ${openNcrs} open NCR(s).`
`HeroBand({ filter })`: overline "NET CASH POSITION", value `formatIdr(cashIn - cashOut)` in `text-display font-mono tabular-nums`, coloured `financial-positive-600`/`financial-negative-600`; narrative line; three `StatCard`s — Contract Value (`portfolio.totals.totalContract`), Budget (`portfolio.totals.totalBudget`, context "(baseline)"), Actual Cost (`portfolio.totals.totalActual`, context `${budget>0? Math.round(actual/budget*100):0}% of budget`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- hero-band`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/hero-band/
git commit -m "feat(web): Hero Band widget (editorial)"
```

---

## Task 13: Financial Band widget + chart restyle

**Files:**
- Modify: `apps/web/src/widgets/dashboard-charts/charts.tsx`
- Create: `apps/web/src/widgets/financial-band/financial-band.tsx`
- Create: `apps/web/src/widgets/financial-band/index.ts`
- Test: `apps/web/src/widgets/financial-band/financial-band.test.tsx`

**Interfaces:**
- Consumes: `useCashFlow`, `useAging`, `usePortfolio` (Task 8), `CashFlowChart`.
- Produces: `agingSegments(buckets): { label: string; value: number }[]` (pure); `AgingBar({ buckets, label })`; `FinancialBand({ filter })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/financial-band/financial-band.test.tsx
import { describe, expect, it } from 'vitest';
import { agingSegments } from './financial-band';

describe('agingSegments', () => {
  it('maps buckets to labelled segments preserving order', () => {
    const seg = agingSegments([
      { bucket: 'CURRENT', amount: 100 },
      { bucket: '1-30', amount: 50 },
    ]);
    expect(seg).toEqual([{ label: 'CURRENT', value: 100 }, { label: '1-30', value: 50 }]);
  });

  it('returns empty array for no buckets', () => {
    expect(agingSegments([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- financial-band`
Expected: FAIL — module not found.

- [ ] **Step 3: Restyle `CashFlowChart` and add `AgingBar`**

In `charts.tsx`: replace hard-coded hex with token colours (`#16a34a`→`#16a34a` is success-600; keep as literals but source from the token values noted in the preset), grid `#e4e4e7`, tick `#71717a`. Keep `CashFlowChart` API unchanged. Add:

```tsx
const AGING_COLORS = ['#22c55e', '#a1a1aa', '#f59e0b', '#f97316', '#ef4444'];

export function AgingBar({ buckets, label }: { buckets: { label: string; value: number }[]; label: string }) {
  const total = buckets.reduce((s, b) => s + b.value, 0);
  if (total <= 0) return <p className="text-body-sm text-neutral-500">No outstanding {label}.</p>;
  return (
    <div role="img" aria-label={`${label}: ${buckets.map((b) => `${b.label} ${formatIdr(b.value)}`).join(', ')}`} className="flex h-4 overflow-hidden rounded-md">
      {buckets.map((b, i) => (
        <div key={b.label} style={{ width: `${(b.value / total) * 100}%`, backgroundColor: AGING_COLORS[i] }} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement `agingSegments` + `FinancialBand`**

`agingSegments(buckets)` → `buckets.map(b => ({ label: b.bucket, value: b.amount }))`.
`FinancialBand({ filter })`: three blocks in `grid gap-6 xl:grid-cols-2` — Cash Flow (`CashFlowChart data={cashFlow.data.series}`), Aging (two `AgingBar`s: AR and AP, with totals), Budget burn (`BulletBar value={actual} max={budget} label="Budget burn"`).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- financial-band`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/widgets/dashboard-charts/charts.tsx apps/web/src/widgets/financial-band/
git commit -m "feat(web): Financial Band + aging bar"
```

---

## Task 14: Dashboard Filter Bar widget

**Files:**
- Create: `apps/web/src/widgets/dashboard-filter-bar/dashboard-filter-bar.tsx`
- Create: `apps/web/src/widgets/dashboard-filter-bar/index.ts`
- Test: `apps/web/src/widgets/dashboard-filter-bar/dashboard-filter-bar.test.tsx`

**Interfaces:**
- Consumes: `SegmentedControl` (Task 2), `EntitySelect`, `useUrlFilter`, `useLegalEntities`, `resolvePeriod`, `DashboardFilter` (Task 8).
- Produces: `useDashboardFilter(): { filter: DashboardFilter; preset: PeriodPreset; setPreset: (p: string) => void; setEntity: (id: string) => void }`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/dashboard-filter-bar/dashboard-filter-bar.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardFilterBarView } from './dashboard-filter-bar';

describe('DashboardFilterBarView', () => {
  it('renders the period options and entity select', () => {
    render(
      <DashboardFilterBarView
        preset="YTD"
        onPresetChange={() => {}}
        entityId=""
        onEntityChange={() => {}}
        entities={[{ value: 'LE1', label: 'PT A' }]}
        onReload={() => {}}
        isLoading={false}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: /period/i })).toBeTruthy();
    expect(screen.getByText('YTD')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- dashboard-filter-bar`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `useDashboardFilter` + `DashboardFilterBarView` + `DashboardFilterBar`**

`useDashboardFilter`: read `period` and `entity` via `useUrlFilter`; `preset = (period || 'YTD') as PeriodPreset`; `filter = { legalEntityId: entity || undefined, ...resolvePeriod(preset, new Date()) }`.
`DashboardFilterBarView(props)`: a `flex items-center gap-3` row: `SegmentedControl` (MTD/QTD/YTD/12M — CUSTOM omitted from Phase A UI; the preset type still supports it) + `EntitySelect` (first option "All entities" → `value: ''`) + `Button` Reload + `LastUpdated`.
`DashboardFilterBar({ onReload, isLoading, queryKey })`: `useLegalEntities({ page: 1, pageSize: 200 })` → options; wires `useDashboardFilter`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- dashboard-filter-bar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/dashboard-filter-bar/
git commit -m "feat(web): Dashboard Filter Bar (period + entity, URL state)"
```

---

## Task 15: Recompose `dashboard.page.tsx`

**Files:**
- Modify: `apps/web/src/pages/dashboard.page.tsx`
- Delete: `apps/web/src/widgets/dashboard-grid/` (all files)
- Test: `apps/web/src/pages/dashboard.page.test.tsx`

**Interfaces:**
- Consumes: all widgets from Tasks 9–14.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/pages/dashboard.page.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));
vi.mock('@/widgets/dashboard-filter-bar', () => ({
  useDashboardFilter: () => ({ filter: {}, preset: 'YTD', setPreset: vi.fn(), setEntity: vi.fn() }),
  DashboardFilterBar: () => <div data-testid="filter-bar" />,
}));
vi.mock('@/widgets/signal-rail', () => ({ SignalRail: () => <div data-testid="signal-rail" /> }));
vi.mock('@/widgets/hero-band', () => ({ HeroBand: () => <div data-testid="hero-band" /> }));
vi.mock('@/widgets/financial-band', () => ({ FinancialBand: () => <div data-testid="financial-band" /> }));
vi.mock('@/widgets/portfolio-canvas', () => ({ PortfolioCanvas: () => <div data-testid="canvas" /> }));
vi.mock('@/widgets/portfolio-spine', () => ({ PortfolioSpine: () => <div data-testid="spine" /> }));

describe('DashboardPage', () => {
  it('renders the five zones', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    for (const id of ['filter-bar', 'signal-rail', 'hero-band', 'financial-band']) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- dashboard.page`
Expected: FAIL (current page still imports retired widgets / does not render zones).

- [ ] **Step 3: Recompose the page**

`DashboardPage` obtains `{ filter, preset, setPreset, setEntity } = useDashboardFilter()`. Render, in order, inside a `div className="space-y-6"`:
1. header (`text-h1` title "Dashboard", subtitle) + `<DashboardFilterBar ... />`
2. `<SignalRail />`
3. `<div className="grid gap-6 xl:grid-cols-12"><div className="xl:col-span-7"><HeroBand filter={filter} /></div><div className="xl:col-span-5"><FinancialBand filter={filter} /></div></div>`
4. `<PortfolioZone filter={filter} />` — a small local component with a `SegmentedControl` toggling `view` (`canvas`/`tabel`) stored via `useUrlFilter('view')`, default `canvas`, rendering `PortfolioCanvas` or `PortfolioSpine`.
Add a staggered reveal: wrap zones 1–4 in elements with `className="animate-slide-up"` and inline `style={{ animationDelay: \`${i * 40}ms\` }}`.

- [ ] **Step 4: Delete retired widgets**

Delete `apps/web/src/widgets/dashboard-grid/dashboard-grid.tsx`, `index.ts`, and the folder. Confirm nothing else imports `DashboardGrid`, `KpiCard`, `HealthCount`, or `HealthDonut` (grep). Update any remaining import.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- dashboard.page`
Expected: PASS. Then `pnpm --filter @aec/web typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/dashboard.page.tsx apps/web/src/pages/dashboard.page.test.tsx apps/web/src/widgets/dashboard-grid
git commit -m "feat(web): recompose dashboard into 5 zones; retire dashboard-grid"
```

---

## Task 16: Drill-through support on target pages

**Files:**
- Modify: `apps/web/src/pages/project/project-health.page.tsx`
- Test: `apps/web/src/pages/project/project-health.page.test.tsx`

**Interfaces:**
- Consumes: `useUrlFilter`.
- Produces: `/project-health?project=<id>` preselects the project.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/pages/project/project-health.page.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-router', () => ({ useSearch: () => ({ project: 'p2' }), Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@/entities/project', () => ({ useProjects: () => ({ data: { items: [{ id: 'p1', code: 'A', name: 'A' }, { id: 'p2', code: 'B', name: 'B' }] } }) }));
vi.mock('@/features/project', () => ({ useProjectHealth: (id: string) => ({ data: id === 'p2' ? { projectId: 'p2' } : undefined, isLoading: false, isError: false, refetch: vi.fn() }) }));
vi.mock('@/features/project/ui', () => ({ HealthSummary: () => <div>summary</div>, HealthTable: () => <div>table</div> }));

describe('ProjectHealthPage', () => {
  it('preselects the project from the URL param', async () => {
    const { ProjectHealthPage } = await import('./project-health.page');
    render(<ProjectHealthPage />);
    expect(await screen.findByText('summary')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- project-health.page`
Expected: FAIL — page ignores `?project=`.

- [ ] **Step 3: Read the URL param**

In `project-health.page.tsx`, replace the local `useState('')` with `useUrlFilter('project')`, keeping the `EntitySelect` but calling the URL setter. Preserve the existing fallback to the first project when the param is empty.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- project-health.page`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/project/project-health.page.tsx apps/web/src/pages/project/project-health.page.test.tsx
git commit -m "feat(web): project-health honours ?project= drill-through"
```

---

## Task 17: Whole-suite verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck the monorepo**

Run: `pnpm typecheck`
Expected: `Tasks: 10 successful, 10 total`.

- [ ] **Step 2: Lint the monorepo**

Run: `pnpm lint`
Expected: `Tasks: 6 successful, 6 total`.

- [ ] **Step 3: API unit tests**

Run: `pnpm --filter @aec/api test:unit`
Expected: all suites pass (previous 18 + new date-range/analytics/portfolio/approval suites).

- [ ] **Step 4: Web tests**

Run: `pnpm --filter @aec/web test`
Expected: all files pass (previous 12 + new widget/page/util tests).

- [ ] **Step 5: Manual smoke (optional, needs running app)**

With Postgres+Redis up and `DATABASE_URL` overridden, run API + web; log in as `admin@aec.local / Admin123!`; confirm: changing period/entity updates numbers; Signal Rail deep-links filter the target list; canvas/table toggle works; a canvas point opens project health.

- [ ] **Step 6: Commit any fixes, then push**

```bash
git push
```

---

## Self-Review Notes

- **Spec coverage:** Zona 0 → Task 14; Zona 1 → Task 9; Zona 2 → Task 12; Zona 3 → Task 13; Zona 4 → Tasks 10, 11; filter backend → Tasks 5, 6; pending-count → Task 7; drill-through → Tasks 9, 10, 11, 16; token → Task 1; primitives → Tasks 1–3; motion/a11y → Tasks 2, 3, 10, 15; testing → each task + Task 17.
- **Deferred within Phase A (documented in spec §2.2):** `CUSTOM` date inputs are not surfaced in the UI (the `PeriodPreset` type and `resolvePeriod` still support it), because the segmented control ships the four presets; custom range moves to Phase C alongside delta period. `project-cost-summary` stays unfiltered (noted in spec §3.5).
- **Type consistency:** `DashboardFilter` is defined once (Task 8) and reused; `SignalSeverity` defined in Task 3 and consumed in Task 9; `CanvasPoint` produced and consumed only in Task 10.

