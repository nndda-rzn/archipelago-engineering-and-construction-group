# Legal Entities Management Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/foundation/legal-entities` into a full management surface — a register-style list (searchable/filterable/shareable), a detail page with profile + cross-domain usage + lifecycle (edit/block/activate), backed by an audit-compliant API and a DB with enforced status/currency integrity.

**Architecture:** Additive backend (CAS status transitions, usage aggregation, audit trail) + a data migration (seed Currency, add currency FKs with backfill, convert `status` to an enum, add missing indexes) + five new frontend components using existing `@aec/ui` primitives (register table with `BulletBar`/`StackedBar` encoding, not cards).

**Tech Stack:** NestJS 10 + Prisma (PostgreSQL) · React 18 + TanStack Query/Router · Tailwind token preset · Vitest + RTL (web) · Jest (api).

**Spec:** `docs/superpowers/specs/2026-10-13-legal-entities-workspace-design.md`

## Global Constraints

- All user-facing copy in English; money/date formatting stays `id-ID` (`shared/lib/format.ts`).
- Every number renders `font-mono tabular-nums`.
- Charts/visuals import colour only from tokens; never write a new hex literal.
- No metric-card grid as a page backbone; no gradients, glow, or entrance animations; hairline separators, not boxes/zebra.
- Semantic `<table>` for the register (a11y); rows focusable (Enter/Space), `aria-sort` on sortable headers.
- Every surface handles loading / error (`role="alert"` + retry) / empty before rendering data; never a fabricated `0`.
- Status values are the `MasterDataStatus` set: `DRAFT | PENDING_REVIEW | ACTIVE | BLOCKED | INACTIVE | ARCHIVED`.
- Backend changes are additive: with no new params, existing endpoints behave as before.
- Audit: every mutation records `LEGAL_ENTITY.<ACTION>` via `AuditService`.
- One requirement = one branch (`feature/legal-entities-workspace`, base `develop`), merge commit (no squash).
- Web tests `*.test.tsx` beside source (Vitest); API unit tests `*.spec.ts` beside source (Jest).

## Review Focus

1. **An existing DB has `LegalEntity` rows but an empty `Currency` table** — the migration must insert the currency rows before adding the FK, or `migrate deploy` fails. Covered in Task 1 Step 6 (migration runs on seeded data).
2. **A `LegalEntity` whose currency code is outside the seeded set** — backfill must leave the new FK column `NULL` (nullable) rather than fail the migration. Covered in Task 1 Step 1 (test: unknown code → null FK).
3. **Double-clicking Block on an already-blocked entity** — CAS must not produce a second transition or a duplicate audit. Covered in Task 4 Step 1.
4. **Unblocking an `ACTIVE` entity** — must return 409 `INVALID_STATUS_TRANSITION`, not silently succeed. Covered in Task 4 Step 1.
5. **An entity with zero related records** — usage returns all zeros and the register bar renders without a divide-by-zero. Covered in Task 3 Step 1 and Task 8 Step 1.

---

### Task 1: DB migration — currency seed/backfill, status enum, indexes

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (add `enum LegalEntityStatus`, currency relations on `LegalEntity`, `@@index` on `User`/`Organization`/`Equipment`/`LegalEntity`)
- Create: `apps/api/prisma/migrations/<timestamp>_legal_entity_integrity/migration.sql` (generated via `--create-only`, then hand-edited)

**Interfaces:**
- Produces: Prisma model `LegalEntity` with fields `functionalCurrencyId String?`, `reportingCurrencyId String?`, relations `functionalCurrency Currency? @relation("FunctionalCurrency", ...)`, `reportingCurrency Currency? @relation("ReportingCurrency", ...)`; `status LegalEntityStatus`; enum `LegalEntityStatus`.
- Consumes: nothing (this is the base task).

- [ ] **Step 1: Write the migration, then verify backfill behavior on seeded data**

Author the SQL in two parts: Prisma-generated DDL, then the hand-written data steps. The final SQL must, in order:

```sql
-- 1) Enum
CREATE TYPE "LegalEntityStatus" AS ENUM ('DRAFT','PENDING_REVIEW','ACTIVE','BLOCKED','INACTIVE','ARCHIVED');

-- 2) Seed currencies (idempotent) BEFORE any FK
INSERT INTO "Currency" ("id","code","name","symbol","decimals","isActive","createdAt","updatedAt")
VALUES ('cur-idr','IDR','Indonesian Rupiah','Rp',2,true,now(),now()),
       ('cur-usd','USD','US Dollar','$',2,true,now(),now())
ON CONFLICT ("code") DO NOTHING;

-- 3) FK columns
ALTER TABLE "LegalEntity" ADD COLUMN "functionalCurrencyId" TEXT;
ALTER TABLE "LegalEntity" ADD COLUMN "reportingCurrencyId" TEXT;

-- 4) Backfill from existing codes (unknown code -> stays NULL, do not fail)
UPDATE "LegalEntity" le SET "functionalCurrencyId" = c."id" FROM "Currency" c WHERE c."code" = le."functionalCurrency";
UPDATE "LegalEntity" le SET "reportingCurrencyId"  = c."id" FROM "Currency" c WHERE c."code" = le."reportingCurrency";

-- 5) Constraints
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_functionalCurrencyId_fkey" FOREIGN KEY ("functionalCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_reportingCurrencyId_fkey"  FOREIGN KEY ("reportingCurrencyId")  REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6) status TEXT -> enum
ALTER TABLE "LegalEntity" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LegalEntity" ALTER COLUMN "status" TYPE "LegalEntityStatus" USING ("status"::text::"LegalEntityStatus");
ALTER TABLE "LegalEntity" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 7) Indexes
CREATE INDEX "User_legalEntityId_idx" ON "User"("legalEntityId");
CREATE INDEX "Organization_legalEntityId_idx" ON "Organization"("legalEntityId");
CREATE INDEX "Equipment_legalEntityId_idx" ON "Equipment"("legalEntityId");
CREATE INDEX "LegalEntity_status_idx" ON "LegalEntity"("status");
```

Run: `pnpm --filter @aec/api exec prisma migrate reset --force` (resets + applies all migrations + seeds). Then insert a probe row with an unknown currency and re-run just the backfill logic mentally is not enough — instead assert the column allows NULL:

Run: `pnpm --filter @aec/api exec prisma db execute --stdin <<'SQL'` with `SELECT count(*) FROM "LegalEntity" WHERE "functionalCurrencyId" IS NULL;` — Expected: runs without error (NULL is allowed).

- [ ] **Step 2: Update `schema.prisma` to match**

Add the enum, the two nullable FK fields + relations (with relation names `FunctionalCurrency`/`ReportingCurrency` on both sides of `Currency`), change `status String` → `status LegalEntityStatus @default(ACTIVE)`, and add the four `@@index` lines. Then:

Run: `pnpm --filter @aec/api exec prisma generate`
Expected: "Generated Prisma Client" with no error.

- [ ] **Step 3: Verify the migration is clean both ways**

Run: `pnpm --filter @aec/api exec prisma migrate reset --force` → Expected: all migrations apply, seed runs.
Run: `pnpm --filter @aec/api exec prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations prisma/migrations --exit-code` → Expected: "No difference detected" (exit 0).

- [ ] **Step 4: Verify the API still compiles against the new types**

Run: `pnpm --filter @aec/api typecheck`
Expected: PASS (0 errors). If any read of `legalEntity.status` fails to type, fix it here.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(db): legal entity status enum, currency FKs with backfill, and missing indexes"
```

---

### Task 2: Contracts — usage schema, update schema, status in list params

**Files:**
- Modify: `packages/api-contracts/src/foundation.ts`
- Test: `apps/api/src/modules/foundation/application/services/legal-entity-contracts.spec.ts`

**Interfaces:**
- Produces: `legalEntityUsageSchema` / `type LegalEntityUsage`; `updateLegalEntitySchema` / `type UpdateLegalEntity`; `legalEntityStatusSchema` / `type LegalEntityStatus`; `legalEntitySchema` gains `functionalCurrencyId: z.string().nullable()`, `reportingCurrencyId: z.string().nullable()`, and `status: legalEntityStatusSchema`; `legalEntityListParamsSchema` gains `status?: LegalEntityStatus`; `legalEntityListResponseSchema` items may carry `metrics?: LegalEntityUsage`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/foundation/application/services/legal-entity-contracts.spec.ts
import { legalEntityUsageSchema, updateLegalEntitySchema, legalEntityListParamsSchema } from '@aec/api-contracts';

describe('legal entity contracts', () => {
  it('parses a usage summary', () => {
    const parsed = legalEntityUsageSchema.parse({
      projects: 4, users: 12, organizations: 3, chartOfAccounts: 40,
      bankAccounts: 2, periodCloses: 3, employees: 8, equipment: 5,
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.projects).toBe(4);
  });

  it('accepts a partial update and a status filter', () => {
    expect(updateLegalEntitySchema.parse({ legalName: 'PT Baru' }).legalName).toBe('PT Baru');
    expect(legalEntityListParamsSchema.parse({ status: 'BLOCKED' }).status).toBe('BLOCKED');
  });

  it('rejects an unknown status filter value', () => {
    expect(() => legalEntityListParamsSchema.parse({ status: 'NOPE' })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- legal-entity-contracts`
Expected: FAIL — `legalEntityUsageSchema` is not exported.

- [ ] **Step 3: Implement the schemas in `packages/api-contracts/src/foundation.ts`**

`legalEntityStatusSchema = z.enum(['DRAFT','PENDING_REVIEW','ACTIVE','BLOCKED','INACTIVE','ARCHIVED'])`. `legalEntityUsageSchema` = object with the eight integer counts + `generatedAt: z.string()`. `updateLegalEntitySchema` = `createLegalEntitySchema.partial()`. Extend `legalEntitySchema` with the two nullable id fields and swap `status` to `legalEntityStatusSchema`. Add `status: legalEntityStatusSchema.optional()` to `legalEntityListParamsSchema`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- legal-entity-contracts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/foundation.ts apps/api/src/modules/foundation/application/services/legal-entity-contracts.spec.ts
git commit -m "feat(contracts): legal entity usage, update, and status filter schemas"
```

---

### Task 3: Backend — usage aggregation

**Files:**
- Modify: `apps/api/src/modules/foundation/application/services/legal-entity.service.ts`
- Test: `apps/api/src/modules/foundation/application/services/legal-entity.service.spec.ts` (create)

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `LegalEntityService.usage(id: string): Promise<LegalEntityUsage>` where `LegalEntityUsage` is the contract type from Task 2; throws `NotFoundException` `LEGAL_ENTITY_NOT_FOUND` when the entity does not exist.

- [ ] **Step 1: Write the failing test**

```ts
// legal-entity.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { LegalEntityService } from './legal-entity.service';

function makeService(prisma: unknown) {
  return new LegalEntityService(prisma as never, { record: jest.fn() } as never);
}

describe('LegalEntityService.usage', () => {
  it('returns zero counts for an entity with no related records', async () => {
    const prisma = {
      legalEntity: { findUnique: jest.fn().mockResolvedValue({ id: 'le1' }) },
      project: { count: jest.fn().mockResolvedValue(0) },
      user: { count: jest.fn().mockResolvedValue(0) },
      organization: { count: jest.fn().mockResolvedValue(0) },
      chartOfAccount: { count: jest.fn().mockResolvedValue(0) },
      bankAccount: { count: jest.fn().mockResolvedValue(0) },
      periodClose: { count: jest.fn().mockResolvedValue(0) },
      employee: { count: jest.fn().mockResolvedValue(0) },
      equipment: { count: jest.fn().mockResolvedValue(0) },
    } as never;
    const svc = makeService(prisma);
    const usage = await svc.usage('le1');
    expect(usage.projects).toBe(0);
    expect(usage.equipment).toBe(0);
    expect(typeof usage.generatedAt).toBe('string');
  });

  it('throws LEGAL_ENTITY_NOT_FOUND for an unknown id', async () => {
    const prisma = { legalEntity: { findUnique: jest.fn().mockResolvedValue(null) } } as never;
    const svc = makeService(prisma);
    await expect(svc.usage('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- legal-entity.service`
Expected: FAIL — `svc.usage is not a function`.

- [ ] **Step 3: Implement `usage(id)`**

In `LegalEntityService`, inject `AuditService` as a second constructor arg. `usage(id)` first calls `findOne(id)` (throws if missing), then runs the eight `count({ where: { legalEntityId: id } })` calls in a single `this.prisma.$transaction([...])` (no N+1 across entities; one round trip), and returns the counts plus `generatedAt: new Date().toISOString()`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- legal-entity.service`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/foundation/application/services/legal-entity.service.ts apps/api/src/modules/foundation/application/services/legal-entity.service.spec.ts
git commit -m "feat(foundation): legal entity usage aggregation"
```

---

### Task 4: Backend — CAS lifecycle + audit trail

**Files:**
- Modify: `apps/api/src/modules/foundation/application/services/legal-entity.service.ts`
- Test: `apps/api/src/modules/foundation/application/services/legal-entity.service.spec.ts` (extend)

**Interfaces:**
- Consumes: `AuditService` (injected in Task 3), `usage` (Task 3).
- Produces:
  - `create(dto, actorId): Promise<LegalEntity>` — now records `LEGAL_ENTITY.CREATE`.
  - `update(id, dto, actorId): Promise<LegalEntity>` — signature gains `actorId`; records `LEGAL_ENTITY.UPDATE` with `oldValue`/`newValue`.
  - `block(id, actorId): Promise<LegalEntity & { usage: LegalEntityUsage }>` — CAS; records `LEGAL_ENTITY.BLOCK`.
  - `unblock(id, actorId): Promise<LegalEntity & { usage: LegalEntityUsage }>` — CAS; records `LEGAL_ENTITY.UNBLOCK`; 409 `INVALID_STATUS_TRANSITION` when not `BLOCKED`.

- [ ] **Step 1: Write the failing tests**

```ts
describe('LegalEntityService lifecycle', () => {
  it('does not re-block an already-blocked entity (CAS count 0) and does not double-audit', async () => {
    const audit = { record: jest.fn() };
    const prisma = {
      legalEntity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'le1', status: 'BLOCKED' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'le1', status: 'BLOCKED' }),
      },
      project: { count: jest.fn().mockResolvedValue(0) }, user: { count: jest.fn().mockResolvedValue(0) },
      organization: { count: jest.fn().mockResolvedValue(0) }, chartOfAccount: { count: jest.fn().mockResolvedValue(0) },
      bankAccount: { count: jest.fn().mockResolvedValue(0) }, periodClose: { count: jest.fn().mockResolvedValue(0) },
      employee: { count: jest.fn().mockResolvedValue(0) }, equipment: { count: jest.fn().mockResolvedValue(0) },
    } as never;
    const svc = new LegalEntityService(prisma, audit as never);
    const result = await svc.block('le1', 'u1');
    expect(result.status).toBe('BLOCKED');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects unblocking an entity that is not BLOCKED', async () => {
    const prisma = {
      legalEntity: { findUnique: jest.fn().mockResolvedValue({ id: 'le1', status: 'ACTIVE' }), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    } as never;
    const svc = new LegalEntityService(prisma, { record: jest.fn() } as never);
    await expect(svc.unblock('le1', 'u1')).rejects.toMatchObject({ response: { code: 'INVALID_STATUS_TRANSITION' } });
  });

  it('records an audit entry on a successful block', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      legalEntity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'le1', status: 'ACTIVE' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'le1', status: 'BLOCKED' }),
      },
      project: { count: jest.fn().mockResolvedValue(0) }, user: { count: jest.fn().mockResolvedValue(0) },
      organization: { count: jest.fn().mockResolvedValue(0) }, chartOfAccount: { count: jest.fn().mockResolvedValue(0) },
      bankAccount: { count: jest.fn().mockResolvedValue(0) }, periodClose: { count: jest.fn().mockResolvedValue(0) },
      employee: { count: jest.fn().mockResolvedValue(0) }, equipment: { count: jest.fn().mockResolvedValue(0) },
    } as never;
    const svc = new LegalEntityService(prisma, audit as never);
    await svc.block('le1', 'u1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEGAL_ENTITY.BLOCK', resourceId: 'le1' }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- legal-entity.service`
Expected: FAIL — `svc.block` / `svc.unblock` not a function, or `unblock` missing.

- [ ] **Step 3: Implement CAS + audit**

- `block(id, actorId)`: `findOne(id)` → `updateMany({ where: { id, status: { not: 'BLOCKED' } }, data: { status: 'BLOCKED' } })`. If `count === 0`, skip audit (idempotent). Else `audit.record({ userId: actorId, action: 'LEGAL_ENTITY.BLOCK', resource: 'LegalEntity', resourceId: id, oldValue: { status: before }, newValue: { status: 'BLOCKED' }, source: 'api' })`. Return `{ ...updated, usage: await this.usage(id) }`.
- `unblock(id, actorId)`: `findOne(id)` → if `status !== 'BLOCKED'` throw `ConflictException({ code: 'INVALID_STATUS_TRANSITION', message: 'Only a BLOCKED entity can be activated' })` → `updateMany({ where: { id, status: 'BLOCKED' }, data: { status: 'ACTIVE' } })`; audit `LEGAL_ENTITY.UNBLOCK`; return `{ ...updated, usage }`.
- `create`/`update`: add `actorId` param and an `audit.record` call (`LEGAL_ENTITY.CREATE` / `LEGAL_ENTITY.UPDATE`, with `oldValue`/`newValue` for update). Resolve currency codes to ids before writing if `functionalCurrency`/`reportingCurrency` are provided (look up `currency.findUnique({ where: { code } })`; unknown code → `BadRequestException` `UNKNOWN_CURRENCY`).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- legal-entity.service`
Expected: PASS (all lifecycle tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/foundation/application/services/legal-entity.service.ts apps/api/src/modules/foundation/application/services/legal-entity.service.spec.ts
git commit -m "feat(foundation): CAS status transitions and audit trail for legal entities"
```

---

### Task 5: Backend — list metrics + status filter, controller wiring

**Files:**
- Modify: `apps/api/src/modules/foundation/application/services/legal-entity.service.ts` (`findAll`)
- Modify: `apps/api/src/modules/foundation/presentation/dto/list-legal-entity-query.dto.ts` (+ `status?`)
- Modify: `apps/api/src/modules/foundation/presentation/controllers/legal-entity.controller.ts` (+ `GET :id/usage`, `POST :id/unblock`; pass actor to create/update/block)
- Test: `apps/api/src/modules/foundation/application/services/legal-entity.service.spec.ts` (extend)

**Interfaces:**
- Consumes: `usage` (Task 3); `block`/`unblock` (Task 4); contract types (Task 2).
- Produces: `findAll(query)` returns `{ items: Array<LegalEntity & { metrics: LegalEntityUsage }>, total, page, pageSize, totalPages }`, honoring `status` and `search`.

- [ ] **Step 1: Write the failing test**

```ts
it('filters by status and attaches per-entity metrics without N+1', async () => {
  const projectGroupBy = jest.fn().mockResolvedValue([{ legalEntityId: 'le1', _count: { _all: 4 } }]);
  const prisma = {
    legalEntity: {
      findMany: jest.fn().mockResolvedValue([{ id: 'le1', code: 'AEC-CON', status: 'ACTIVE' }]),
      count: jest.fn().mockResolvedValue(1),
    },
    project: { groupBy: projectGroupBy },
    user: { groupBy: jest.fn().mockResolvedValue([]) },
    organization: { groupBy: jest.fn().mockResolvedValue([]) },
    chartOfAccount: { groupBy: jest.fn().mockResolvedValue([]) },
    bankAccount: { groupBy: jest.fn().mockResolvedValue([]) },
    periodClose: { groupBy: jest.fn().mockResolvedValue([]) },
    employee: { groupBy: jest.fn().mockResolvedValue([]) },
    equipment: { groupBy: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  } as never;
  const svc = new LegalEntityService(prisma, { record: jest.fn() } as never);
  const result = await svc.findAll({ status: 'ACTIVE' } as never);
  expect(result.items[0]?.metrics.projects).toBe(4);
  expect(projectGroupBy).toHaveBeenCalledTimes(1); // one query for all entities, not per row
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- legal-entity.service`
Expected: FAIL — `result.items[0].metrics` undefined.

- [ ] **Step 3: Implement**

In `findAll`: add `status` to the `where`; keep the existing pagination. After fetching `items`, run the eight `groupBy({ by: ['legalEntityId'], where: { legalEntityId: { in: ids } }, _count: { _all: true } })` in one `$transaction`, build a `Map<legalEntityId, LegalEntityUsage>`, and attach `metrics` to each item (zero-filled when absent). Add `@IsOptional() @IsEnum([...])` `status?` to `ListLegalEntityQueryDto`. In the controller: add `@Get(':id/usage')` (permission `LegalEntityView`) and `@Post(':id/unblock')` (permission `LegalEntityBlock`), and pass `request.user?.sub ?? 'system'` into `create`/`update`/`block`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- legal-entity.service && pnpm --filter @aec/api typecheck`
Expected: PASS + 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/foundation
git commit -m "feat(foundation): list metrics, status filter, and usage/unblock endpoints"
```

---

### Task 6: Frontend hooks

**Files:**
- Modify: `apps/web/src/entities/legal-entity/legal-entity.api.ts`
- Test: `apps/web/src/entities/legal-entity/legal-entity.api.test.ts`

**Interfaces:**
- Consumes: contract types (Task 2); `getJson`/`postJson`/`patchJson` (`@/shared/lib/http`).
- Produces: `useLegalEntity(id)`, `useLegalEntityUsage(id)`, `useUpdateLegalEntity()`, `useBlockLegalEntity()`, `useUnblockLegalEntity()`; `legalEntityKeys.detail(id)` / `.usage(id)`.

- [ ] **Step 1: Write the failing test**

```ts
import { legalEntityKeys } from './legal-entity.api';
it('builds detail and usage query keys', () => {
  expect(legalEntityKeys.detail('le1')).toEqual(['legal-entities', 'detail', 'le1']);
  expect(legalEntityKeys.usage('le1')).toEqual(['legal-entities', 'usage', 'le1']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- legal-entity.api`
Expected: FAIL — `legalEntityKeys.detail` undefined.

- [ ] **Step 3: Implement**

Add `detail`/`usage` to `legalEntityKeys` and the five hooks, mirroring existing `useLegalEntities`/`useCreateLegalEntity` (parse with the schemas from Task 2; mutations invalidate `legalEntityKeys.all`).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- legal-entity.api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/entities/legal-entity
git commit -m "feat(legal-entities-web): detail, usage, update and lifecycle hooks"
```

---

### Task 7: Frontend — list toolbar (search + status, URL state)

**Files:**
- Create: `apps/web/src/features/foundation/ui/legal-entity-list-toolbar.tsx`
- Modify: `apps/web/src/features/foundation/ui/index.ts`
- Test: `apps/web/src/features/foundation/ui/legal-entity-list-toolbar.test.tsx`

**Interfaces:**
- Consumes: `SegmentedControl`, `Input`, `Button` (`@aec/ui`); `useUrlFilter` (`@/shared/lib/use-url-state`).
- Produces: `LegalEntityListToolbarView({ search, onSearchChange, status, onStatusChange, onAdd })` (presentational) and `useLegalEntityListFilters(): { search, status, setSearch, setStatus }` (URL-backed, keys `q`/`status`).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { LegalEntityListToolbarView } from './legal-entity-list-toolbar';

it('renders search, a status filter, and one primary add action', () => {
  render(<LegalEntityListToolbarView search="" onSearchChange={() => {}} status="ACTIVE" onStatusChange={() => {}} onAdd={() => {}} />);
  expect(screen.getByRole('searchbox')).toBeTruthy();
  expect(screen.getByRole('radiogroup', { name: /status/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /add entity/i })).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- legal-entity-list-toolbar`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`LegalEntityListToolbarView` renders a debounced `<input type="search" aria-label="Search legal entities">` (debounce ~300ms in the connected `LegalEntityListToolbar`), a `SegmentedControl aria-label="Status"` with `All/Active/Blocked/Inactive`, and one primary `+ Add entity` `Button`. `useLegalEntityListFilters` reads/writes `q` and `status` via `useUrlFilter`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- legal-entity-list-toolbar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/foundation/ui/legal-entity-list-toolbar.* apps/web/src/features/foundation/ui/index.ts
git commit -m "feat(legal-entities-web): list toolbar with search and status filter"
```

---

### Task 8: Frontend — register table (semantic table + encoding)

**Files:**
- Modify: `apps/web/src/features/foundation/ui/legal-entity-grid.tsx` (replace `legalEntityColumns` with a `LegalEntityRegister` component)
- Modify: `apps/web/src/features/foundation/ui/index.ts`
- Test: `apps/web/src/features/foundation/ui/legal-entity-register.test.tsx`

**Interfaces:**
- Consumes: `EntityAvatar`, `BulletBar`, `StackedBar`, `StatusBadge` (`@aec/ui`); `LegalEntity & { metrics }` (Task 5).
- Produces: `LegalEntityRegister({ items, onRowClick, sort, onSortChange })` — a `<table>` with `<thead>/<th scope="col" aria-sort>` and focusable `<tr>` rows; columns: Identity (avatar + code + name), Scale (`BulletBar`), Composition (`StackedBar`), Status, Country/Currency.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { LegalEntityRegister } from './legal-entity-register';

const items = [
  { id: 'le1', code: 'AEC-CON', legalName: 'PT AEC Construction', status: 'ACTIVE', country: 'ID', functionalCurrency: 'IDR', metrics: { projects: 4, users: 12, organizations: 3, chartOfAccounts: 40, bankAccounts: 2, periodCloses: 3, employees: 8, equipment: 5 } },
];

it('renders a semantic table with a scale bar and does not divide by zero when all metrics are zero', () => {
  render(<LegalEntityRegister items={items as never} onRowClick={() => {}} sort={[]} onSortChange={() => {}} />);
  expect(screen.getByRole('table', { name: /legal entities/i })).toBeTruthy();
  expect(screen.getByRole('img', { name: /scale/i })).toBeTruthy();
  render(<LegalEntityRegister items={[{ ...items[0], metrics: { projects: 0, users: 0, organizations: 0, chartOfAccounts: 0, bankAccounts: 0, periodCloses: 0, employees: 0, equipment: 0 } }] as never} onRowClick={() => {}} sort={[]} onSortChange={() => {}} />);
  expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- legal-entity-register`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`LegalEntityRegister` renders a hairline-separated `<table aria-label="Legal entities">` (no per-cell borders/zebra). Scale column: a `BulletBar` whose `max` is the largest `projects` across `items` (guard `max > 0`, else render a neutral empty bar). Composition column: a `StackedBar` with segments `projects`/`users`/`chartOfAccounts` (tones neutral-dark/mid/light). Rows are `tabIndex={0}` with Enter/Space invoking `onRowClick`. Sortable headers set `aria-sort` and call `onSortChange`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- legal-entity-register`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/foundation/ui/legal-entity-register.* apps/web/src/features/foundation/ui/index.ts
git commit -m "feat(legal-entities-web): register table with scale and composition encoding"
```

---

### Task 9: Frontend — form completion (create/edit)

**Files:**
- Modify: `apps/web/src/features/foundation/ui/legal-entity-form.tsx`
- Test: `apps/web/src/features/foundation/ui/legal-entity-form.test.tsx`

**Interfaces:**
- Consumes: `createLegalEntitySchema`/`updateLegalEntitySchema` (Task 2); `useCreateLegalEntity`/`useUpdateLegalEntity` (Task 6); `useCurrencies` (`@/features/foundation-hardening`) for the currency options.
- Produces: `LegalEntityForm({ mode: 'create' | 'edit', entity?: LegalEntity, onDone })` — renders all fields (code, legalName, taxIdentifier, country, functionalCurrency, reportingCurrency, fiscalCalendar), validates on blur, shows errors beside fields.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { LegalEntityForm } from './legal-entity-form';

vi.mock('@/entities/legal-entity', () => ({
  useCreateLegalEntity: () => ({ mutate: () => {}, isPending: false, isError: false }),
  useUpdateLegalEntity: () => ({ mutate: () => {}, isPending: false, isError: false }),
}));
vi.mock('@/features/foundation-hardening', () => ({ useCurrencies: () => ({ data: { items: [{ code: 'IDR', name: 'Rupiah' }] } }) }));

it('renders currency and fiscal calendar fields', () => {
  render(<LegalEntityForm mode="create" onDone={() => {}} />);
  expect(screen.getByLabelText(/functional currency/i)).toBeTruthy();
  expect(screen.getByLabelText(/reporting currency/i)).toBeTruthy();
  expect(screen.getByLabelText(/fiscal calendar/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- legal-entity-form`
Expected: FAIL — fields not found.

- [ ] **Step 3: Implement**

Extend the form schema with `functionalCurrency`, `reportingCurrency`, `fiscalCalendar`. Render all fields with `<Label htmlFor>` above each `<Input>`; set `mode="onBlur"` with `reValidateMode="onChange"`. On edit, default values come from `entity` and submit uses `useUpdateLegalEntity`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- legal-entity-form`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/foundation/ui/legal-entity-form.*
git commit -m "feat(legal-entities-web): complete create/edit form with currency and fiscal calendar"
```

---

### Task 10: Frontend — rebuild the list page

**Files:**
- Modify: `apps/web/src/pages/foundation/legal-entity-list.page.tsx`
- Test: `apps/web/src/pages/foundation/legal-entity-list.page.test.tsx`

**Interfaces:**
- Consumes: `LegalEntityListToolbar` (Task 7), `LegalEntityRegister` (Task 8), `LegalEntityForm` (Task 9), `useLegalEntities` (existing).
- Produces: `LegalEntityListPage` rendering toolbar + register + form, with URL-backed filters.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { LegalEntityListPage } from './legal-entity-list.page';
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</>, useNavigate: () => vi.fn() }));
vi.mock('@/entities/legal-entity', () => ({ useLegalEntities: () => ({ data: { items: [], total: 0 }, isLoading: false, isError: false, refetch: () => {} }) }));
vi.mock('@/features/foundation/ui', () => ({
  LegalEntityListToolbar: () => <div data-testid="toolbar" />,
  LegalEntityRegister: () => <div data-testid="register" />,
  LegalEntityForm: () => <div data-testid="form" />,
}));
it('renders toolbar and register', () => {
  render(<LegalEntityListPage />);
  expect(screen.getByTestId('toolbar')).toBeTruthy();
  expect(screen.getByTestId('register')).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- legal-entity-list.page`
Expected: FAIL — testids missing.

- [ ] **Step 3: Implement**

Rewrite the page to render `<LegalEntityListToolbar/>`, then `<LegalEntityRegister/>` (from `useLegalEntities` with the URL filters), plus `<LegalEntityForm/>` shown when adding. Loading → row skeleton; error → `role="alert"` + retry; empty → distinct messages for "no entities yet" vs "no matches for this filter".

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- legal-entity-list.page`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/foundation/legal-entity-list.page.*
git commit -m "feat(legal-entities-web): rebuild list page as a register"
```

---

### Task 11: Frontend — detail page (profile, footprint, readiness, lifecycle) + route

**Files:**
- Create: `apps/web/src/features/foundation/ui/legal-entity-profile.tsx`, `legal-entity-usage.tsx`, `legal-entity-lifecycle.tsx`
- Create: `apps/web/src/pages/foundation/legal-entity-detail.page.tsx`
- Modify: `apps/web/src/features/foundation/ui/index.ts`
- Modify: `apps/web/src/routeTree.tsx` (add `legalEntityDetailRoute` `/foundation/legal-entities/$entityId`)
- Modify: `packages/ui/src/enterprise/status-badge.tsx` (add `statusMeta.BLOCKED`)
- Test: `apps/web/src/features/foundation/ui/legal-entity-lifecycle.test.tsx`, `apps/web/src/pages/foundation/legal-entity-detail.page.test.tsx`

**Interfaces:**
- Consumes: `useLegalEntity`, `useLegalEntityUsage`, `useBlockLegalEntity`, `useUnblockLegalEntity`, `useUpdateLegalEntity` (Task 6); `ConfirmActionButton`/`ConfirmDialog`, `StackedBar`, `BulletBar`, `StatusBadge` (`@aec/ui`).
- Produces: `LegalEntityProfile({ entity })`, `LegalEntityUsage({ usage })`, `LegalEntityLifecycle({ entity })`, `LegalEntityDetailPage`; `statusMeta.BLOCKED = { label: 'Blocked', variant: 'warning', icon: Ban }`.

- [ ] **Step 1: Write the failing tests**

```tsx
// legal-entity-lifecycle.test.tsx
import { render, screen } from '@testing-library/react';
import { LegalEntityLifecycle } from './legal-entity-lifecycle';
vi.mock('@/entities/legal-entity', () => ({
  useBlockLegalEntity: () => ({ mutate: () => {}, isPending: false }),
  useUnblockLegalEntity: () => ({ mutate: () => {}, isPending: false }),
}));
it('offers Block for an ACTIVE entity and Activate for a BLOCKED one', () => {
  render(<LegalEntityLifecycle entity={{ id: 'le1', status: 'ACTIVE' } as never} />);
  expect(screen.getByRole('button', { name: /block/i })).toBeTruthy();
  render(<LegalEntityLifecycle entity={{ id: 'le1', status: 'BLOCKED' } as never} />);
  expect(screen.getByRole('button', { name: /activate/i })).toBeTruthy();
});
```

```tsx
// legal-entity-detail.page.test.tsx
import { render, screen } from '@testing-library/react';
import { LegalEntityDetailPage } from './legal-entity-detail.page';
vi.mock('@tanstack/react-router', () => ({ useParams: () => ({ entityId: 'le1' }), Link: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/entities/legal-entity', () => ({
  useLegalEntity: () => ({ data: { id: 'le1', code: 'AEC-CON', legalName: 'PT AEC', status: 'ACTIVE', country: 'ID', functionalCurrency: 'IDR', reportingCurrency: 'IDR', fiscalCalendar: 'STANDARD', taxIdentifier: 'x', createdAt: 'x', updatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
  useLegalEntityUsage: () => ({ data: { projects: 4, users: 12, organizations: 3, chartOfAccounts: 40, bankAccounts: 2, periodCloses: 3, employees: 8, equipment: 5, generatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
  useBlockLegalEntity: () => ({ mutate: () => {}, isPending: false }),
  useUnblockLegalEntity: () => ({ mutate: () => {}, isPending: false }),
}));
it('renders profile, usage and lifecycle zones', () => {
  render(<LegalEntityDetailPage />);
  expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  expect(screen.getByText(/used in/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- legal-entity-lifecycle legal-entity-detail.page`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

- `LegalEntityProfile`: `<dl>` of all fields.
- `LegalEntityUsage`: `<h2>Used in</h2>` + a `StackedBar` footprint band + a labelled count list with links (Projects → `/projects`, Users → `/foundation/users`, etc.); zeros shown honestly.
- `LegalEntityLifecycle`: Edit button + `ConfirmActionButton` "Block entity" (confirm description includes the usage summary) when `ACTIVE`, or "Activate" when `BLOCKED`.
- `LegalEntityDetailPage`: `useParams` → fetch entity + usage; header (back, identity, `StatusBadge`, lifecycle); sections Profile / Used in / Readiness (COA · open periods · DoA · fiscal calendar). Loading skeleton; error `role="alert"` + retry.
- `routeTree.tsx`: add the route under `appRoute` with `requirePermission(Permission.LegalEntityView)`; register it in `appRoute.addChildren([...])`.
- `status-badge.tsx`: add `BLOCKED` to `StatusKey` and `statusMeta`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- legal-entity-lifecycle legal-entity-detail.page`
Expected: PASS.

- [ ] **Step 5: Run the full gate**

Run: `pnpm --filter @aec/api test:unit && pnpm --filter @aec/web test && pnpm lint && pnpm typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src packages/ui/src
git commit -m "feat(legal-entities-web): detail page with profile, usage and lifecycle"
```

---

## Self-Review

**1. Spec coverage:**
- §3.1 list (toolbar, register, URL state) → Tasks 7, 8, 10. ✅
- §3.2 detail (profile, footprint, readiness, lifecycle, block dialog) → Task 11. ✅
- §3.3 visual basis + hard limits → Global Constraints + Tasks 8/11. ✅
- §4 backend (CAS, findAll metrics+status, usage/unblock endpoints, audit, validation) → Tasks 3, 4, 5. ✅
- §5 DB (seed/backfill currency, FK, enum, indexes, fiscalCalendar stays string) → Task 1. ✅
- §6 contracts → Task 2. ✅
- §7 error handling → Tasks 4 (`INVALID_STATUS_TRANSITION`), 8–11 (FE states). ✅
- §8 testing/gate → each task + Task 11 Step 5. ✅
- §9 PR split → PR1 = Task 1; PR2 = Tasks 2–5; PR3 = Tasks 6–10; PR4 = Task 11. ✅

**2. Step scan:** every step names a file, a command, or a concrete assertion. ✅

**3. Type consistency:** `LegalEntityUsage` defined in Task 2, produced by Task 3, consumed by Tasks 5/8/11; `block`/`unblock` return `{ ...entity, usage }` consistently (Tasks 4/5/6); hook names match across Tasks 6/8/10/11. ✅

**4. Review Focus:** RF1 → Task 1 Step 3 (migrate on seeded data); RF2 → Task 1 Step 1 (unknown code → NULL); RF3 → Task 4 Step 1 (CAS count 0, no double audit); RF4 → Task 4 Step 1 (409); RF5 → Task 3 Step 1 + Task 8 Step 1 (zero metrics). ✅

**5. Proportion:** plan is signature-and-assertion oriented; SQL and algorithm bodies appear only where not otherwise determined. ✅
