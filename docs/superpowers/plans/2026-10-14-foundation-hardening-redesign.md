# Foundation Hardening Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/foundation/hardening` as three domain tabs (Organization, Delegation of Authority, Currency & Exchange Rate) with rich data-function visuals — not flat tables — and full manage/analyse functionality, backed by additive endpoints and a small additive migration.

**Architecture:** Additive backend (update/status CAS+audit endpoints, DoA overlap analysis, exchange-rate history), a small additive migration (DoaRuleStatus enum via `USING` cast + three indexes), a recursive org-tree contract, and a frontend that follows the repo's tab-in-URL convention. Fixes a real bug (org tree parsed as a flat array) and a dead no-op (resolve validation).

**Tech Stack:** NestJS 10 + Prisma (PostgreSQL) · React 18 + TanStack Query/Router · Tailwind token preset · Vitest + RTL (web) · Jest (api).

**Spec:** `docs/superpowers/specs/2026-10-14-foundation-hardening-redesign-design.md`

## Global Constraints

- All user-facing copy in English; money/date formatting stays `id-ID` (`shared/lib/format.ts`).
- Every number renders `font-mono tabular-nums`.
- Visuals use repo tokens only — never a new hex literal or font.
- No metric-card grid, no gradients/glow/entrance animation; structure from rules + space (`SectionBand`), hairline separators.
- One accent (`racing-red`) for actions only; selection uses `neutral-800`.
- Every visual carries a non-colour partner (`role="img"` + `aria-label`) and an adjacent text value.
- Every section handles loading / error (`role="alert"` + retry) / empty before rendering data; never a fabricated `0`.
- Tabs live in the URL (`useUrlFilter('tab')`), per the repo convention.
- Status mutations use compare-and-set (`updateMany` guarded by current status) and record an audit entry; invalid transitions → 409 `INVALID_STATUS_TRANSITION`.
- Backend changes are additive: existing endpoints behave as before with no new params.
- One requirement = one branch (`feature/foundation-hardening-redesign`, base `develop`), merge commit (no squash).
- Web tests `*.test.tsx` beside source (Vitest); API unit tests `*.spec.ts` beside source (Jest).

## Review Focus

1. **A DoA rule with an open upper bound (`amountTo = null`)** must be treated as unbounded (∞) by the overlap analysis, not as a zero-width range. Covered in Task 4 Step 1.
2. **Two DoA rules whose ranges only touch at one boundary (e.g. 0–100 and 100–200)** — decide whether that is an overlap; the spec treats touching boundaries as *not* overlapping. Covered in Task 4 Step 1.
3. **An organisation unit with `parentId = null`** must render at the root of the outline, and a unit whose parent is filtered out by `asOf` must not vanish silently (it surfaces as a root). Covered in Task 6 Step 1 and Task 8 Step 1.
4. **A `parentId` that would create a cycle** (setting a unit's parent to its own descendant) must be rejected (400 `ORG_CYCLE`), not loop forever. Covered in Task 3 Step 1.
5. **An exchange-rate history with a single data point** must render the sparkline safely (no divide-by-zero), per `Sparkline`'s contract. Covered in Task 11 Step 1.

---

### Task 1: DB migration — DoaRuleStatus enum + indexes

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (add `enum DoaRuleStatus`, change `DoaRule.status`, add indexes)
- Create: `apps/api/prisma/migrations/<timestamp>_foundation_hardening_integrity/migration.sql`

**Interfaces:**
- Produces: Prisma enum `DoaRuleStatus` (`ACTIVE | INACTIVE`); `DoaRule.status DoaRuleStatus @default(ACTIVE)`; indexes `Organization(legalEntityId, effectiveFrom, effectiveTo)`, `ExchangeRate(fromCurrencyId, toCurrencyId, effectiveDate)`, `DoaRule(transactionType, status)`.
- Consumes: nothing.

- [ ] **Step 1: Update `schema.prisma`**

Add near the top-level enums: `enum DoaRuleStatus { ACTIVE INACTIVE }`. Change `DoaRule.status String @default("ACTIVE") // ACTIVE | INACTIVE` → `status DoaRuleStatus @default(ACTIVE)`. Add the three `@@index` lines to `Organization`, `ExchangeRate`, `DoaRule`.

- [ ] **Step 2: Generate the migration SQL and edit it**

Run: `pnpm --filter @aec/api exec prisma migrate diff --from-config-datasource --to-schema apps/api/prisma/schema.prisma --script` (from repo root) to see the generated DDL. Then author the migration file by hand so the enum conversion preserves data:

```sql
-- 1) Enum
CREATE TYPE "DoaRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- 2) status TEXT -> enum, preserving values (no drop+recreate)
ALTER TABLE "DoaRule" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DoaRule" ALTER COLUMN "status" TYPE "DoaRuleStatus" USING ("status"::text::"DoaRuleStatus");
ALTER TABLE "DoaRule" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 3) Indexes
CREATE INDEX "Organization_legalEntityId_effectiveFrom_effectiveTo_idx" ON "Organization"("legalEntityId", "effectiveFrom", "effectiveTo");
CREATE INDEX "ExchangeRate_fromCurrencyId_toCurrencyId_effectiveDate_idx" ON "ExchangeRate"("fromCurrencyId", "toCurrencyId", "effectiveDate");
CREATE INDEX "DoaRule_transactionType_status_idx" ON "DoaRule"("transactionType", "status");
```

- [ ] **Step 3: Apply and verify**

Run: `pnpm --filter @aec/api exec prisma generate`
Run: `pnpm --filter @aec/api exec prisma migrate deploy`
Expected: "All migrations have been successfully applied."
Run: `pnpm --filter @aec/api exec prisma migrate reset --force` → all migrations apply from scratch; seed runs.
Run: `pnpm --filter @aec/api typecheck` → PASS (0 errors).

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(db): doa rule status enum and foundation hardening indexes"
```

---

### Task 2: Contracts — recursive org node, update/analysis/rate-history schemas

**Files:**
- Modify: `packages/api-contracts/src/foundation-hardening.ts`
- Test: `apps/api/src/modules/foundation/application/services/hardening-contracts.spec.ts`

**Interfaces:**
- Produces:
  - `organizationNodeSchema` (recursive) / `type OrganizationNode` = `{ item: Organization; children: OrganizationNode[] }`
  - `updateOrganizationSchema` = `createOrganizationSchema.partial()`
  - `updateDoaRuleSchema` = `createDoaRuleSchema.partial()`
  - `doaOverlapSchema` / `doaGapSchema` / `doaAnalysisSchema` / `type DoaAnalysis`
  - `rateHistoryPointSchema` / `rateHistorySchema` / `type RateHistory`
  - `setStatusSchema` = `{ status: z.enum(['ACTIVE','INACTIVE']) }`
  - `organizationSchema` gains nothing; `exchangeRateHistoryParamsSchema` = `{ fromCurrencyId, toCurrencyId, rateType? }`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/foundation/application/services/hardening-contracts.spec.ts
import { organizationNodeSchema, doaAnalysisSchema, rateHistorySchema, updateOrganizationSchema } from '@aec/api-contracts';

describe('foundation hardening contracts', () => {
  it('parses a recursive organization tree node', () => {
    const parsed = organizationNodeSchema.parse({
      item: { id: 'o1', legalEntityId: 'le1', name: 'Group', orgType: 'GROUP', parentId: null, effectiveFrom: '2026-01-01', effectiveTo: null, status: 'ACTIVE' },
      children: [{ item: { id: 'o2', legalEntityId: 'le1', name: 'BU', orgType: 'BUSINESS_UNIT', parentId: 'o1', effectiveFrom: '2026-01-01', effectiveTo: null, status: 'ACTIVE' }, children: [] }],
    });
    expect(parsed.children[0]?.item.name).toBe('BU');
  });

  it('parses a doa analysis with overlaps and gaps', () => {
    const parsed = doaAnalysisSchema.parse({
      transactionType: 'PurchaseOrder',
      overlaps: [{ aId: 'r1', bId: 'r2', from: 100, to: 200 }],
      gaps: [{ from: 500, to: 1000 }],
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.overlaps[0]?.from).toBe(100);
  });

  it('parses a rate history series', () => {
    const parsed = rateHistorySchema.parse({
      fromCurrencyId: 'c1', toCurrencyId: 'c2', rateType: 'SPOT',
      points: [{ effectiveDate: '2026-01-01', rate: 15000 }],
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.points[0]?.rate).toBe(15000);
  });

  it('accepts a partial organization update', () => {
    expect(updateOrganizationSchema.parse({ name: 'Renamed' }).name).toBe('Renamed');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- hardening-contracts`
Expected: FAIL — `organizationNodeSchema` is not exported.

- [ ] **Step 3: Implement the schemas**

`organizationNodeSchema` is recursive: declare `type OrganizationNode = { item: Organization; children: OrganizationNode[] }` and use `z.lazy(() => z.object({ item: organizationSchema, children: z.array(organizationNodeSchema) }))`. `doaOverlapSchema = { aId, bId, from: number, to: number | null }`; `doaGapSchema = { from: number, to: number | null }`; `doaAnalysisSchema = { transactionType, overlaps: array, gaps: array, generatedAt }`. `rateHistoryPointSchema = { effectiveDate, rate }`; `rateHistorySchema = { fromCurrencyId, toCurrencyId, rateType, points, generatedAt }`. `setStatusSchema = { status: z.enum(['ACTIVE','INACTIVE']) }`. `updateOrganizationSchema = createOrganizationSchema.partial()`, `updateDoaRuleSchema = createDoaRuleSchema.partial()`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- hardening-contracts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/foundation-hardening.ts apps/api/src/modules/foundation/application/services/hardening-contracts.spec.ts
git commit -m "feat(contracts): recursive org tree, doa analysis and rate history schemas"
```

---

### Task 3: Backend — organization update + status (CAS + audit) + cycle guard

**Files:**
- Modify: `apps/api/src/modules/foundation/application/services/organization.service.ts`
- Modify: `apps/api/src/modules/foundation/presentation/dto/foundation-hardening.dto.ts` (add `UpdateOrganizationDto`, `SetStatusDto`)
- Test: `apps/api/src/modules/foundation/application/services/organization.service.spec.ts`

**Interfaces:**
- Consumes: `AuditService`, `PrismaService`.
- Produces: `OrganizationService.updateOrganization(id, dto, actorId)`, `OrganizationService.setStatus(id, status, actorId)`; throws `NotFoundException` `ORG_NOT_FOUND`, `BadRequestException` `ORG_CYCLE`, `ConflictException` `INVALID_STATUS_TRANSITION`.

- [ ] **Step 1: Write the failing test**

```ts
// organization.service.spec.ts
import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrganizationService } from './organization.service';

function makeService(prisma: unknown, audit = { record: jest.fn() }) {
  return new OrganizationService(prisma as never, audit as never);
}

describe('OrganizationService.updateOrganization', () => {
  it('rejects setting a parent to one of its own descendants (cycle)', async () => {
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', legalEntityId: 'le1', parentId: null }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'o1', parentId: null }, { id: 'o2', parentId: 'o1' }, { id: 'o3', parentId: 'o2' },
        ]),
      },
    } as never;
    const svc = makeService(prisma);
    const err = await svc.updateOrganization('o1', { parentId: 'o3' } as never, 'u1').catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toEqual(expect.objectContaining({ code: 'ORG_CYCLE' }));
  });

  it('updates and records an audit entry', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', legalEntityId: 'le1', parentId: null, name: 'Old', orgType: 'GROUP' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'o1', parentId: null }]),
        update: jest.fn().mockResolvedValue({ id: 'o1', name: 'New' }),
      },
    } as never;
    const svc = makeService(prisma, audit);
    await svc.updateOrganization('o1', { name: 'New' } as never, 'u1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Organization.UPDATE' }));
  });
});

describe('OrganizationService.setStatus', () => {
  it('rejects a no-op transition with 409 INVALID_STATUS_TRANSITION', async () => {
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', status: 'INACTIVE' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as never;
    const svc = makeService(prisma);
    const err = await svc.setStatus('o1', 'INACTIVE', 'u1').catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toEqual(expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- organization.service`
Expected: FAIL — `svc.updateOrganization is not a function`.

- [ ] **Step 3: Implement**

- `updateOrganization(id, dto, actorId)`: `findOne` (throw `ORG_NOT_FOUND`). If `dto.parentId` is provided, load all orgs of the same `legalEntityId`, walk up from the proposed parent; if `id` is reachable → throw `BadRequestException({ code: 'ORG_CYCLE' })`. Then `update`, then `audit.record({ action: 'Organization.UPDATE', oldValue, newValue })`.
- `setStatus(id, status, actorId)`: `findOne`; `updateMany({ where: { id, status: { not: status } }, data: { status } })`; if `count === 0` throw `ConflictException({ code: 'INVALID_STATUS_TRANSITION' })`; else audit `Organization.STATUS`.
- DTOs: `UpdateOrganizationDto extends PartialType(CreateOrganizationDto)`; `SetStatusDto { @IsEnum(['ACTIVE','INACTIVE']) status!: 'ACTIVE' | 'INACTIVE' }`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- organization.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/foundation
git commit -m "feat(foundation): organization update with cycle guard and CAS status"
```

---

### Task 4: Backend — DoA analysis (overlaps + gaps)

**Files:**
- Modify: `apps/api/src/modules/foundation/application/services/doa.service.ts`
- Test: `apps/api/src/modules/foundation/application/services/doa.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `DoaService.analyzeRules(transactionType: string): Promise<DoaAnalysis>` — `overlaps` = pairs of active rules whose `[amountFrom, amountTo]` intervals intersect with positive length; `gaps` = numeric ranges between `0` and the highest bound not covered by any rule. `null` `amountFrom` = 0, `null` `amountTo` = ∞.

- [ ] **Step 1: Write the failing test**

```ts
// doa.service.spec.ts
import { DoaService } from './doa.service';

function makeService(rules: unknown[]) {
  const prisma = { doaRule: { findMany: async () => rules } } as never;
  return new DoaService(prisma, { record: jest.fn() } as never);
}

describe('DoaService.analyzeRules', () => {
  it('treats an open upper bound as unbounded and finds the overlap', async () => {
    const svc = makeService([
      { id: 'r1', transactionType: 'PurchaseOrder', amountFrom: 0, amountTo: 100, status: 'ACTIVE' },
      { id: 'r2', transactionType: 'PurchaseOrder', amountFrom: 50, amountTo: null, status: 'ACTIVE' },
    ]);
    const out = await svc.analyzeRules('PurchaseOrder');
    expect(out.overlaps).toEqual([{ aId: 'r1', bId: 'r2', from: 50, to: 100 }]);
  });

  it('does not count ranges that only touch at a boundary', async () => {
    const svc = makeService([
      { id: 'r1', transactionType: 'PurchaseOrder', amountFrom: 0, amountTo: 100, status: 'ACTIVE' },
      { id: 'r2', transactionType: 'PurchaseOrder', amountFrom: 100, amountTo: 200, status: 'ACTIVE' },
    ]);
    const out = await svc.analyzeRules('PurchaseOrder');
    expect(out.overlaps).toEqual([]);
  });

  it('reports the gap between two closed ranges', async () => {
    const svc = makeService([
      { id: 'r1', transactionType: 'PurchaseOrder', amountFrom: 0, amountTo: 100, status: 'ACTIVE' },
      { id: 'r2', transactionType: 'PurchaseOrder', amountFrom: 500, amountTo: 1000, status: 'ACTIVE' },
    ]);
    const out = await svc.analyzeRules('PurchaseOrder');
    expect(out.gaps).toEqual([{ from: 100, to: 500 }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- doa.service`
Expected: FAIL — `svc.analyzeRules is not a function`.

- [ ] **Step 3: Implement `analyzeRules(transactionType)`**

Load active rules for the type (`status: 'ACTIVE'`), map each to `{ id, from: Number(amountFrom ?? 0), to: amountTo == null ? Infinity : Number(amountTo) }`. Overlaps: for every pair, intersect `[max(fromA,fromB), min(toA,toB)]`; include when `lo < hi` (strict — touching boundaries do not overlap); emit `{ aId, bId, from: lo, to: finite(hi) ? hi : null }`. Gaps: sort by `from`, sweep from `0`; for each rule, if `rule.from > cursor` emit `{ from: cursor, to: rule.from }`; advance `cursor = max(cursor, rule.to)`; stop when `cursor` is Infinity. Return `{ transactionType, overlaps, gaps, generatedAt }`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- doa.service`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/foundation/application/services/doa.service.ts apps/api/src/modules/foundation/application/services/doa.service.spec.ts
git commit -m "feat(foundation): doa rule overlap and gap analysis"
```

---

### Task 5: Backend — DoA update/status, currency status, rate history, controller wiring

**Files:**
- Modify: `apps/api/src/modules/foundation/application/services/doa.service.ts` (`updateDoaRule`, `setStatus`)
- Modify: `apps/api/src/modules/foundation/application/services/currency.service.ts` (`setCurrencyStatus`, `rateHistory`)
- Modify: `apps/api/src/modules/foundation/presentation/controllers/foundation-hardening.controller.ts` (+ routes)
- Modify: `apps/api/src/modules/foundation/presentation/dto/foundation-hardening.dto.ts` (`UpdateDoaRuleDto`)
- Test: `apps/api/src/modules/foundation/application/services/currency.service.spec.ts`

**Interfaces:**
- Consumes: contracts from Task 2; `AuditService`.
- Produces: `DoaService.updateDoaRule(id, dto, actorId)`, `DoaService.setStatus(id, status, actorId)`; `CurrencyService.setCurrencyStatus(id, status, actorId)`, `CurrencyService.rateHistory(fromCurrencyId, toCurrencyId, rateType?)`; routes `PATCH /organizations/:id`, `POST /organizations/:id/status`, `PATCH /doa-rules/:id`, `POST /doa-rules/:id/status`, `GET /doa-rules/analysis`, `POST /currencies/:id/status`, `GET /exchange-rates/history`.

- [ ] **Step 1: Write the failing test (rate history)**

```ts
// currency.service.spec.ts
import { CurrencyService } from './currency.service';

function makeService(prisma: unknown) {
  return new CurrencyService(prisma as never, { record: jest.fn() } as never);
}

describe('CurrencyService.rateHistory', () => {
  it('returns points ordered by effective date ascending', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { effectiveDate: new Date('2026-03-01'), rate: 15200 },
      { effectiveDate: new Date('2026-01-01'), rate: 15000 },
    ]);
    const svc = makeService({ exchangeRate: { findMany } } as never);
    const out = await svc.rateHistory('c1', 'c2');
    expect(out.points.map((p) => p.rate)).toEqual([15000, 15200]);
    expect(out.rateType).toBe('SPOT');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- currency.service`
Expected: FAIL — `svc.rateHistory is not a function`.

- [ ] **Step 3: Implement**

- `CurrencyService.rateHistory(fromCurrencyId, toCurrencyId, rateType = 'SPOT')`: `exchangeRate.findMany({ where: { fromCurrencyId, toCurrencyId, rateType }, orderBy: { effectiveDate: 'asc' }, select: { effectiveDate: true, rate: true } })`; return `{ fromCurrencyId, toCurrencyId, rateType, points: rows.map(r => ({ effectiveDate: r.effectiveDate.toISOString(), rate: Number(r.rate) })), generatedAt }`.
- `CurrencyService.setCurrencyStatus(id, status, actorId)`: `findOne` → `updateMany` CAS on `isActive` → audit `Currency.STATUS`; `count === 0` → 409 `INVALID_STATUS_TRANSITION`.
- `DoaService.updateDoaRule` / `setStatus`: mirror Task 3 (findOne → update/`updateMany` CAS → audit).
- Controller: add the seven routes, each with the appropriate `@Permissions` (`FoundationHardeningView` + `LegalEntityEdit` for org/currency mutations, `RoleCreate` for DoA mutations, `LegalEntityView`/`RoleView` for reads). Place `GET doa-rules/analysis` **before** any `:id` route.
- DTO: `UpdateDoaRuleDto extends PartialType(CreateDoaRuleDto)`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- currency.service && pnpm --filter @aec/api typecheck`
Expected: PASS + 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/foundation
git commit -m "feat(foundation): doa update/status, currency status and rate history endpoints"
```

---

### Task 6: Frontend hooks — fix tree parsing, add new hooks, drop IFC/readiness

**Files:**
- Modify: `apps/web/src/features/foundation-hardening/model/foundation-hardening.api.ts`
- Test: `apps/web/src/features/foundation-hardening/model/foundation-hardening.api.test.ts`

**Interfaces:**
- Consumes: contract schemas from Task 2.
- Produces: `useOrganizations` returns `OrganizationNode[]`; `useUpdateOrganization`, `useSetOrganizationStatus`, `useUpdateDoaRule`, `useSetDoaRuleStatus`, `useDoaAnalysis(transactionType)`, `useSetCurrencyStatus`, `useRateHistory(fromId, toId, rateType?)`. Removes `useIfc`, `useReadiness`.

- [ ] **Step 1: Write the failing test**

```ts
// foundation-hardening.api.test.ts
import { describe, expect, it } from 'vitest';
import { hardeningKeys } from './foundation-hardening.api';

describe('hardeningKeys', () => {
  it('keys doa analysis by transaction type', () => {
    expect(hardeningKeys.doaAnalysis('PurchaseOrder')).toEqual(['foundation-hardening', 'doa-analysis', 'PurchaseOrder']);
  });
  it('keys rate history by pair and type', () => {
    expect(hardeningKeys.rateHistory('c1', 'c2', 'SPOT')).toEqual(['foundation-hardening', 'rate-history', 'c1', 'c2', 'SPOT']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- foundation-hardening.api`
Expected: FAIL — `hardeningKeys.doaAnalysis` undefined.

- [ ] **Step 3: Implement**

Add `doaAnalysis`/`rateHistory` keys and the seven hooks (query/mutation) mirroring existing style; parse with the Task 2 schemas. **Fix** `useOrganizations` to parse `organizationNodeSchema.array()` (the response `roots` is a tree). **Remove** the dead `const parsed = resolveDoaSchema.parse; void parsed;` line and the unused `useIfc`/`useReadiness`. Mutations invalidate `hardeningKeys.all`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- foundation-hardening.api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/foundation-hardening/model
git commit -m "feat(foundation-hardening-web): fix tree parsing, add hooks, drop ifc/readiness"
```

---

### Task 7: UI primitives — TimeBand, SegmentRuler, RateMatrix

**Files:**
- Create: `packages/ui/src/primitives/time-band.tsx`, `packages/ui/src/primitives/segment-ruler.tsx`, `packages/ui/src/primitives/rate-matrix.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `packages/ui/src/primitives/time-band.test.tsx`, `segment-ruler.test.tsx`, `rate-matrix.test.tsx`

**Interfaces:**
- Produces:
  - `TimeBand({ bands, from, to, marker, onMarkerChange })` — bands `{ id, label, start, end: string | null }`; `marker` ISO date; renders an accessible time axis with one row per band.
  - `SegmentRuler({ segments, domain, markers })` — segments `{ id, label, from, to: number | null }`; `markers` `{ from, to }[]`; shared numeric scale; overlap/gap markers labelled in text.
  - `RateMatrix({ rows, cols, value, format })` — sequential-intensity cells with `title` full value.

- [ ] **Step 1: Write the failing tests**

```tsx
// segment-ruler.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SegmentRuler } from './segment-ruler';

describe('SegmentRuler', () => {
  it('exposes an accessible label listing every segment', () => {
    render(<SegmentRuler domain={[0, 1000]} segments={[{ id: 'a', label: 'L2', from: 0, to: 100 }, { id: 'b', label: 'L3', from: 500, to: null }]} markers={[]} />);
    expect(screen.getByRole('img', { name: /L2.*L3/i })).toBeTruthy();
  });
});
```

```tsx
// rate-matrix.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RateMatrix } from './rate-matrix';

describe('RateMatrix', () => {
  it('renders a cell per pair with a full-value title', () => {
    render(<RateMatrix rows={['IDR']} cols={['USD']} value={() => 15000} format={(n) => `Rp ${n}`} />);
    expect(screen.getByTitle('Rp 15000')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @aec/ui test -- segment-ruler rate-matrix`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the three primitives**

Each is a token-only, `role="img"` + `aria-label` visual with an adjacent-text contract and a safe empty state (no divide-by-zero). `TimeBand` uses a shared time scale; `SegmentRuler` a shared numeric scale; `RateMatrix` a sequential neutral ramp derived from the token palette (light→dark of one hue). Export all three from `packages/ui/src/index.ts`.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter @aec/ui test -- segment-ruler rate-matrix time-band`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src
git commit -m "feat(ui): time band, segment ruler and rate matrix primitives"
```

---

### Task 8: Frontend — Organization tab (outline + timeline + form + scrubber)

**Files:**
- Create: `apps/web/src/features/foundation-hardening/ui/org-outline.tsx`, `org-timeline.tsx`
- Modify: `apps/web/src/features/foundation-hardening/ui/org-form.tsx`, `foundation-sections.tsx`, `index.ts`
- Test: `apps/web/src/features/foundation-hardening/ui/org-outline.test.tsx`

**Interfaces:**
- Consumes: `useOrganizations`/`useCreateOrganization`/`useUpdateOrganization`/`useSetOrganizationStatus` (Task 6), `TimeBand` (Task 7), `SectionBand`/`BulletBar`/`AvatarStack`/`StatusBadge` (`@aec/ui`).
- Produces: `OrgOutline({ nodes, onEdit })`, `OrgTimeline({ nodes, asOf, onAsOfChange })`, `OrgForm` (create/edit with parent select).

- [ ] **Step 1: Write the failing test**

```tsx
// org-outline.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrgOutline } from './org-outline';

const node = (id: string, name: string, children: unknown[] = []) => ({
  item: { id, legalEntityId: 'le1', name, orgType: 'BUSINESS_UNIT', parentId: null, effectiveFrom: '2026-01-01', effectiveTo: null, status: 'ACTIVE' }, children,
});

describe('OrgOutline', () => {
  it('renders nested units with indentation and a zero-child unit without crashing', () => {
    render(<OrgOutline nodes={[node('o1', 'Group', [node('o2', 'BU')])] as never} onEdit={() => {}} />);
    expect(screen.getByText('Group')).toBeTruthy();
    expect(screen.getByText('BU')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- org-outline`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

- `OrgOutline`: recursive nested `<ul>` (indent per level); each row: name, `Badge` orgType, headcount `BulletBar`, `AvatarStack`, effective range text, `StatusBadge`, edit/status actions. Empty → `EmptyState`.
- `OrgTimeline`: `TimeBand` per unit with `asOf` marker + a date `Input` (scrubber) bound to `onAsOfChange`.
- `OrgForm`: add a parent `Select` (options = orgs of the chosen entity); supports edit mode via `entity`.
- `foundation-sections.tsx`: `OrgSection` uses `SectionBand` + a `SegmentedControl` toggle `[Structure | Timeline]`; loading → skeleton; error → `role="alert"` + retry.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- org-outline`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/foundation-hardening/ui
git commit -m "feat(foundation-hardening-web): organization outline, timeline and form"
```

---

### Task 9: Frontend — DoA tab (authority ladder + analysis + contextual resolve)

**Files:**
- Create: `apps/web/src/features/foundation-hardening/ui/doa-ladder.tsx`, `doa-analysis.tsx`
- Modify: `apps/web/src/features/foundation-hardening/ui/doa-form.tsx`, `foundation-sections.tsx`, `index.ts`
- Test: `apps/web/src/features/foundation-hardening/ui/doa-ladder.test.tsx`

**Interfaces:**
- Consumes: `useDoaRules`/`useCreateDoaRule`/`useUpdateDoaRule`/`useSetDoaRuleStatus`/`useDoaAnalysis`/`useResolveDoa` (Task 6), `SegmentRuler` (Task 7), `StatusPill`/`SectionBand` (`@aec/ui`).
- Produces: `DoaLadder({ rules, transactionType, resolvedMarker })`, `DoaAnalysis({ analysis })`, `DoaForm` (create/edit), `ResolveForm` (full context).

- [ ] **Step 1: Write the failing test**

```tsx
// doa-ladder.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DoaLadder } from './doa-ladder';

describe('DoaLadder', () => {
  it('labels each rule segment with its approver level', () => {
    render(<DoaLadder transactionType="PurchaseOrder" resolvedMarker={null} rules={[
      { id: 'r1', transactionType: 'PurchaseOrder', amountFrom: 0, amountTo: 100, approverLevel: 'L1', riskLevel: null, approverRoleCode: null, status: 'ACTIVE', legalEntityId: null, businessUnit: null, projectId: null, currencyCode: null, approvalMode: 'SEQUENTIAL', priority: 0 },
    ] as never} />);
    expect(screen.getByRole('img', { name: /L1/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- doa-ladder`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

- `DoaLadder`: map rules to `SegmentRuler` segments (label = approver level); pass overlaps from `useDoaAnalysis` as `markers`; when `resolvedMarker` set, add a position marker.
- `DoaAnalysis`: list overlaps/gaps with `StatusPill` severity + text; empty → "No overlaps or gaps detected."
- `DoaForm`: add edit mode; `ResolveForm`: add legalEntity/project/businessUnit/currency/risk inputs and send full context; render the resolved level + role.
- `DoaSection`: `SectionBand` + ladder + analysis + forms; loading/error/empty.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- doa-ladder`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/foundation-hardening/ui
git commit -m "feat(foundation-hardening-web): doa authority ladder, analysis and contextual resolve"
```

---

### Task 10: Frontend — Currency & Rate tab (register + matrix + history + revalue)

**Files:**
- Create: `apps/web/src/features/foundation-hardening/ui/currency-register.tsx`, `rate-matrix.tsx`, `rate-history.tsx`
- Modify: `apps/web/src/features/foundation-hardening/ui/currency-form.tsx`, `foundation-sections.tsx`, `index.ts`
- Test: `apps/web/src/features/foundation-hardening/ui/rate-history.test.tsx`

**Interfaces:**
- Consumes: `useCurrencies`/`useCreateCurrency`/`useSetCurrencyStatus`/`useExchangeRates`/`useCreateExchangeRate`/`useRateHistory` (Task 6), `RateMatrix`/`Sparkline`/`DeltaBadge` (`@aec/ui`).
- Produces: `CurrencyRegister`, `RateMatrixPanel`, `RateHistory`, `CurrencyForm` (full fields).

- [ ] **Step 1: Write the failing test**

```tsx
// rate-history.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RateHistoryView } from './rate-history';

describe('RateHistoryView', () => {
  it('renders safely with a single data point', () => {
    render(<RateHistoryView data={{ fromCurrencyId: 'c1', toCurrencyId: 'c2', rateType: 'SPOT', points: [{ effectiveDate: '2026-01-01', rate: 15000 }], generatedAt: 'x' }} />);
    expect(screen.getByRole('img', { name: /rate/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- rate-history`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

- `CurrencyRegister`: `DataGrid` of currencies (code/name/symbol/decimals/status) + status action.
- `RateMatrixPanel`: `RateMatrix` from the latest rate per pair.
- `RateHistory`: pair/type selectors + `Sparkline` of the series + last-point `DeltaBadge`; empty → `EmptyState`.
- `CurrencyForm`: add `symbol`/`decimals` inputs and `effectiveDate` for rates.
- `CurrencyRateSection`: `SectionBand` panels; loading/error/empty each.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- rate-history`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/foundation-hardening/ui
git commit -m "feat(foundation-hardening-web): currency register, rate matrix and history"
```

---

### Task 11: Frontend — rebuild the page (3 tabs, URL) and remove IFC/readiness

**Files:**
- Modify: `apps/web/src/pages/foundation/foundation-hardening.page.tsx`
- Modify: `apps/web/src/features/foundation-hardening/ui/index.ts`
- Create: `apps/web/src/features/foundation-hardening/ui/hardening-tabs.tsx`
- Test: `apps/web/src/pages/foundation/foundation-hardening.page.test.tsx`

**Interfaces:**
- Consumes: `OrgSection` (Task 8), `DoaSection` (Task 9), `CurrencyRateSection` (Task 10).
- Produces: `HardeningTabs({ value, onChange })` (`role="tablist"`), `FoundationHardeningPage` with 3 URL-backed tabs.

- [ ] **Step 1: Write the failing test**

```tsx
// foundation-hardening.page.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FoundationHardeningPage } from './foundation-hardening.page';

vi.mock('@/features/foundation-hardening/ui', () => ({
  HardeningTabs: () => <div data-testid="tabs" />,
  OrgSection: () => <div data-testid="org" />,
  DoaSection: () => <div data-testid="doa" />,
  CurrencyRateSection: () => <div data-testid="currency" />,
}));
vi.mock('@/shared/lib/use-url-state', () => ({ useUrlFilter: (_k: string, d: string) => [d, () => {}] }));

describe('FoundationHardeningPage', () => {
  it('renders tabs and the organization section by default', () => {
    render(<FoundationHardeningPage />);
    expect(screen.getByTestId('tabs')).toBeTruthy();
    expect(screen.getByTestId('org')).toBeTruthy();
  });
  it('does not render ifc or readiness sections', () => {
    const { container } = render(<FoundationHardeningPage />);
    expect(container.textContent).not.toMatch(/IFC|readiness/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- foundation-hardening.page`
Expected: FAIL — testids missing.

- [ ] **Step 3: Implement**

- `HardeningTabs`: `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls`, arrow-key nav, underline indicator (not a red pill).
- `FoundationHardeningPage`: `useUrlFilter('tab', 'org')`; render `HardeningTabs` then the matching section; subtitle updated (no IFC/readiness promise). Remove `IfcSection` and all `useIfc`/`useReadiness` usage; delete those exports from `ui/index.ts`.
- Run the full gate.

- [ ] **Step 4: Run the full gate**

Run: `pnpm --filter @aec/api test:unit && pnpm --filter @aec/web test && pnpm lint && pnpm typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src apps/api/src packages/ui/src packages/api-contracts/src
git commit -m "feat(foundation-hardening-web): rebuild page as three domain tabs"
```

---

## Self-Review

**1. Spec coverage:**
- §3 three tabs, URL state → Task 11. ✅
- §4.1 Organization (outline, timeline, scrubber, CRUD) → Tasks 3, 8. ✅
- §4.2 DoA (ladder, analysis, simulator, CRUD) → Tasks 4, 5, 9. ✅
- §4.3 Currency (register, matrix, history, revalue, CRUD) → Tasks 5, 10. ✅
- §5 visual basis + hard limits → Global Constraints + Tasks 7–10. ✅
- §6 endpoints + contracts + bug fixes → Tasks 2, 5, 6. ✅
- §7 DB (enum + indexes) → Task 1. ✅
- §8 primitives → Task 7. ✅
- §10 error handling → Tasks 8–11 (FE states), 3/5 (409). ✅
- §11 testing/gate → each task + Task 11 Step 4. ✅
- §12 PR split → PR1 = Tasks 1–5; PR2 = Task 8; PR3 = Task 9; PR4 = Tasks 6–7, 10–11. ✅ (Task 6/7 are shared FE/UI foundations folded into the slices that need them.)

**2. Step scan:** every step names a file, a command, or a concrete assertion. ✅

**3. Type consistency:** `OrganizationNode` defined in Task 2, produced by Task 6, consumed by Task 8; `DoaAnalysis` defined in Task 2, produced by Task 4, consumed by Task 9; `RateHistory` defined in Task 2, produced by Task 5, consumed by Task 10; hook names consistent across Tasks 6/8/9/10/11. ✅

**4. Review Focus:** RF1 → Task 4 Step 1 (null = ∞); RF2 → Task 4 Step 1 (touching boundaries); RF3 → Task 8 Step 1 + Task 3 Step 3 (orphan parent → root); RF4 → Task 3 Step 1 (`ORG_CYCLE`); RF5 → Task 10 Step 1 (`RateHistoryView` single point). ✅

**5. Proportion:** signature-and-assertion oriented; bodies appear only where an algorithm is not determined (overlap/gap sweep, cycle walk). ✅
