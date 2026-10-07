import { NotFoundException } from '@nestjs/common';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowQueryService } from './shared/workflow-query.service';
import type { WorkflowStepService } from './workflow-step.service';
import type { WorkflowLifecycleService } from './workflow-lifecycle.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock test: tiap model diganti sebagian
type MockPrisma = Record<string, any>;

function makePrisma(overrides: Record<string, unknown> = {}): MockPrisma {
  const prisma: MockPrisma = {
    workflowDefinition: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'def-new', ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'def-1', ...data })),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
  return prisma;
}

function makeFacade(prisma: unknown, over: { steps?: Record<string, unknown>; lifecycle?: Record<string, unknown> } = {}) {
  const steps = over.steps ?? { addStep: jest.fn(), updateStep: jest.fn(), removeStep: jest.fn(), reorderSteps: jest.fn() };
  const lifecycle = over.lifecycle ?? { publishWorkflow: jest.fn(), archiveWorkflow: jest.fn(), duplicateDefinition: jest.fn(), createNewVersion: jest.fn() };
  const svc = new WorkflowDefinitionService(
    prisma as never,
    { record: jest.fn() } as never,
    new WorkflowQueryService(prisma as never),
    steps as unknown as WorkflowStepService,
    lifecycle as unknown as WorkflowLifecycleService,
  );
  return { svc, steps, lifecycle };
}

describe('WorkflowDefinitionService (facade) — delegasi ke sub-service', () => {
  it('delegates addStep/updateStep/removeStep/reorderSteps to the step service', async () => {
    const { svc, steps } = makeFacade(makePrisma());
    await svc.addStep('def-1', { stepOrder: 1 } as never, 'u1');
    await svc.updateStep('def-1', 's1', {} as never, 'u1');
    await svc.removeStep('def-1', 's1', 'u1');
    await svc.reorderSteps('def-1', { stepIds: [] } as never, 'u1');
    expect(steps.addStep).toHaveBeenCalledWith('def-1', { stepOrder: 1 }, 'u1');
    expect(steps.updateStep).toHaveBeenCalledWith('def-1', 's1', {}, 'u1');
    expect(steps.removeStep).toHaveBeenCalledWith('def-1', 's1', 'u1');
    expect(steps.reorderSteps).toHaveBeenCalledWith('def-1', { stepIds: [] }, 'u1');
  });

  it('delegates publish/archive/duplicate/newVersion to the lifecycle service', async () => {
    const { svc, lifecycle } = makeFacade(makePrisma());
    await svc.publishWorkflow('def-1', { newVersionName: 'x' } as never, 'u1');
    await svc.archiveWorkflow('def-1', 'u1');
    await svc.duplicateDefinition('def-1', { code: 'C' } as never, 'u1');
    await svc.createNewVersion('PR_APPROVAL', 'u1');
    expect(lifecycle.publishWorkflow).toHaveBeenCalledWith('def-1', { newVersionName: 'x' }, 'u1');
    expect(lifecycle.archiveWorkflow).toHaveBeenCalledWith('def-1', 'u1');
    expect(lifecycle.duplicateDefinition).toHaveBeenCalledWith('def-1', { code: 'C' }, 'u1');
    expect(lifecycle.createNewVersion).toHaveBeenCalledWith('PR_APPROVAL', 'u1');
  });
});

describe('WorkflowDefinitionService (facade) — read-model', () => {
  it('reads a stored group back as a group, not as raw JSON', async () => {
    const group = { combinator: 'AND' as const, conditions: [{ field: 'estimatedTotal', op: '>' as const, value: 5_000_000 }] };
    const prisma = makePrisma({
      workflowDefinition: {
        ...makePrisma().workflowDefinition,
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'def-1', code: 'PR_APPROVAL', name: 'PR', description: null, version: 1, status: 'DRAFT',
            transactionType: 'PurchaseRequisition', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(),
            steps: [
              { id: 's1', definitionId: 'def-1', stepOrder: 1, name: 'Board', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000, conditionGroup: group },
            ],
          },
        ]),
      },
    });
    const defs = await makeFacade(prisma).svc.listDefinitions();
    expect(defs[0]!.steps[0]!.conditionGroup).toEqual(group);
  });

  it('reports added, removed and changed steps between two versions', async () => {
    const from = {
      id: 'v1', code: 'PR_APPROVAL', version: 1, status: 'ARCHIVED', name: 'v1',
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      steps: [
        { stepOrder: 1, name: 'Manager', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
        { stepOrder: 2, name: 'Board', approverRoleCode: 'SUPER_ADMIN', conditionField: null, conditionOp: null, conditionValue: null },
      ],
    };
    const to = {
      id: 'v2', code: 'PR_APPROVAL', version: 2, status: 'ACTIVE', name: 'v2',
      createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-01'),
      steps: [
        { stepOrder: 1, name: 'Manager', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
        { stepOrder: 2, name: 'Board', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 },
        { stepOrder: 3, name: 'Finance', approverRoleCode: 'SUPER_ADMIN', conditionField: null, conditionOp: null, conditionValue: null },
      ],
    };
    const prisma = makePrisma({
      workflowDefinition: {
        ...makePrisma().workflowDefinition,
        findFirst: jest.fn().mockResolvedValueOnce(from).mockResolvedValueOnce(to),
      },
    });
    const diff = await makeFacade(prisma).svc.diffVersions('PR_APPROVAL', 1, 2);

    expect(diff.added.map((s) => s.stepOrder)).toEqual([3]);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.fields.map((f) => f.field)).toContain('conditionField');
  });

  it('throws when a version does not exist', async () => {
    await expect(makeFacade(makePrisma()).svc.diffVersions('PR_APPROVAL', 1, 9)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WorkflowDefinitionService (facade) — create', () => {
  it('creates a DRAFT definition at version 1', async () => {
    const create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'def-new', ...data }));
    const prisma = makePrisma({ workflowDefinition: { ...makePrisma().workflowDefinition, findFirst: jest.fn().mockResolvedValue(null), create } });
    await makeFacade(prisma).svc.createDefinition({ code: 'X', name: 'X', transactionType: 'PurchaseRequisition' } as never, 'u1');
    const data = create.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.version).toBe(1);
    expect(data.status).toBe('DRAFT');
  });
});
