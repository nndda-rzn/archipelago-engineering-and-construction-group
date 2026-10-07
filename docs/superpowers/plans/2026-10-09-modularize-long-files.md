# Modularize Long Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the oversized approval/analytics/project files into layered units (facade → capability providers → shared injectable → pure helpers) with zero behavior change.

**Architecture:** NestJS services follow the `finance` module pattern (flat `application/services/`, injected helpers via `@Inject(Class)`). Pure helpers are DI-free modules. Frontend follows FSD (features/ui + lib, widgets for connected blocks). Each public service keeps its name and public method surface; controllers unchanged.

**Tech Stack:** NestJS 10, Prisma 7, Jest (unit), Vitest + Testing Library (web), Zod, TypeScript.

**Spec:** none in repo (brainstorming output lives in conversation); rulings are provisional.

## Global Constraints

- New service constructors use `@Inject(Class)` (not string tokens) — mirrors `GlHelper`.
- Pure helper = file with no `@Injectable()`, imported directly.
- Tests are colocated; services are constructed with bare `new Service(...)` (not `Test.createTestingModule`).
- Errors always `{ code, message }` SCREAMING_SNAKE.
- Zero behavior change: existing test assertions are never edited, only wiring.
- Per-task verify: `pnpm --filter @aec/api test:unit` (+ `pnpm --filter @aec/web test` for FE).

## Review Focus

1. `conditionText` unification: the group-aware insights version must win; the old single-column-only version must not.
2. `applicableSteps` keeps its `as unknown as {...}` casts verbatim — do not "clean" them.
3. Maker-checker (BR-003) applies to the requester, not the previous approver.
4. `reorderSteps` / `removeStep` negative-phase reordering inside one transaction must be preserved.
5. `decide` compare-and-set (`updateMany` guarded on `status: 'PENDING'`) must not become `update`.
6. `getDetail` honest degradation: no workflow → chain null; no budget → null; vendor without record → rating null.

---

## Task 1: Pure helper — condition-group-mapper

**Files:**
- Create: `apps/api/src/modules/approval/application/services/shared/condition-group-mapper.ts`
- Test: `apps/api/src/modules/approval/application/services/shared/condition-group-mapper.spec.ts`
- Modify: `workflow-definition.service.ts`, `workflow-insights.service.ts`

**Interfaces:**
- Produces: `toNumber`, `toConditionGroup`, `toJsonInput`, `mirrorFirstCondition`, `toConditionGroupLoose`

- [ ] **Step 1: Write the failing test** (malformed JSON → null; mirror first rule)
- [ ] **Step 2: Run it** — expected FAIL
- [ ] **Step 3: Implement** (move functions verbatim)
- [ ] **Step 4: Run it** — expected PASS
- [ ] **Step 5: Replace usages** in workflow-definition + workflow-insights
- [ ] **Step 6: Commit**

## Task 2: Pure helper — approval-condition-text

**Files:**
- Create: `.../shared/approval-condition-text.ts` + `.spec.ts`
- Modify: `approval-task.service.ts`, `workflow-insights.service.ts`

**Interfaces:**
- Produces: `approvalConditionText(step): string | null` (group-aware)

## Task 3: Shared injectable — RoleAssignmentLookup

**Files:**
- Create: `.../shared/role-assignment.lookup.ts` + `.spec.ts`
- Modify: `approval.module.ts`

**Interfaces:**
- Produces: `activeWhere`, `findActiveAssignment`, `hasRole`, `roleCodesOf`, `assertRoleExists`, `requireHolder`

## Task 4: Shared injectable — WorkflowQueryService

**Files:**
- Create: `.../shared/workflow-query.service.ts` + `.spec.ts`

**Interfaces:**
- Produces: `listWithMeta`, `getActiveDefinition`

## Task 5: ApprovalDetailService

**Files:**
- Create: `.../approval-detail.service.ts` + `.spec.ts`
- Modify: `approval-task.service.ts`

## Task 6: ApprovalQueueService

**Files:**
- Create: `.../approval-queue.service.ts` + `.spec.ts`
- Modify: `approval-task.service.ts`

## Task 7: ApprovalWorkflowEngine

**Files:**
- Create: `.../approval-workflow-engine.service.ts` + `.spec.ts`
- Modify: `approval-task.service.ts`

## Task 8: Facade ApprovalTaskService + wiring

**Files:**
- Modify: `approval-task.service.ts`, `approval.module.ts`, `approval-task.service.spec.ts`

## Task 9: WorkflowStepService

**Files:**
- Create: `.../workflow-step.service.ts` + `.spec.ts`
- Modify: `workflow-definition.service.ts`

## Task 10: WorkflowLifecycleService

**Files:**
- Create: `.../workflow-lifecycle.service.ts` + `.spec.ts`
- Modify: `workflow-definition.service.ts`

## Task 11: Facade WorkflowDefinitionService + insights cleanup

**Files:**
- Modify: `workflow-definition.service.ts`, `workflow-insights.service.ts`, `approval.module.ts`, `workflow-definition.service.spec.ts`

## Task 12: D3 — shared/utils/month-key.ts

**Files:**
- Create: `apps/api/src/shared/utils/month-key.ts` + `.spec.ts`
- Modify: `analytics.service.ts`, `workflow-insights.service.ts`

## Task 13: api-contracts/approval split

**Files:**
- Create: `packages/api-contracts/src/approval/task.ts`, `packages/api-contracts/src/approval/workflow.ts`
- Modify: `packages/api-contracts/src/approval.ts` (barrel)

## Task 14: Frontend — useWorkflowEditor hook

**Files:**
- Create: `apps/web/src/features/approval/model/use-workflow-editor.ts`
- Modify: `apps/web/src/pages/approval/workflow-definition.page.tsx`

## Task 15: Frontend — approval UI components

**Files:**
- Create: `features/approval/ui/workflow-metadata-editor.tsx`, `workflow-identity-card.tsx`, `workflow-inspector.tsx`, `workflow-drawer-tabs.tsx`
- Modify: `features/approval/ui/index.ts`, `workflow-definition.page.tsx`

## Task 16: Frontend — chain step row + chain-text

**Files:**
- Create: `features/approval/ui/workflow-chain-step-row.tsx`, `features/approval/lib/chain-text.ts` + `.test.ts`
- Modify: `features/approval/ui/workflow-chain-list.tsx`

## Task 17: Verify phase 1

- [ ] `pnpm --filter @aec/api test:unit`
- [ ] `pnpm --filter @aec/web test`
- [ ] `pnpm lint` · `pnpm typecheck`
- [ ] Update `docs/architecture/CODEBASE-MAP.md`
- [ ] Commit

---

## Phase 2 (Analytics) — Tasks 18–27

T18 `shared/analytics-date.ts`; T19 `shared/analytics-metrics.ts`; T20 `FinancialAnalyticsService`; T21 `ProjectAnalyticsService`; T22 `ExecutiveAnalyticsService`; T23 `AnalyticsExportService`; T24 facade + module wiring; T25 FE `lib/dashboard-rows.ts`; T26 FE `ui/dashboard-ledger.tsx` + `report-panel.tsx` + `project-cost-table.tsx` + `widgets/anomaly-triage/anomaly-triage-filterable.tsx`; T27 verify.

## Phase 3 (Project/Layout) — Tasks 28–30

T28 `features/project/ui/{commitment-bar,project-edit-form,zone-card}.tsx`; T29 `app/layouts/sidebar-nav-parts.tsx`; T30 verify + CODEBASE-MAP update.
