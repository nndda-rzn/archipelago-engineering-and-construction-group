import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkflowStepService } from './workflow-step.service';
import { RoleAssignmentLookup } from './shared/role-assignment.lookup';
import { WorkflowQueryService } from './shared/workflow-query.service';

/**
 * Mock prisma minimal — hanya method yang dipakai service. Tipe sengaja longgar
 * karena tiap test mengganti sebagian model dengan objek yang lebih kecil.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock test: tiap model diganti sebagian
type MockPrisma = Record<string, any>;

function makePrisma(overrides: Record<string, unknown> = {}): MockPrisma {
  const prisma: MockPrisma = {
    workflowDefinition: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    workflowStep: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'step-new', ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'step-1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'step-1' }),
    },
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1', code: 'PROCUREMENT_MANAGER' }) },
    userRole: { findFirst: jest.fn().mockResolvedValue({ userId: 'u1' }) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
  // Transaksi meneruskan prisma yang sama sebagai `tx`, sehingga kode yang menulis
  // di dalam transaksi berjalan seperti di produksi.
  if (!overrides.$transaction) {
    prisma.$transaction = jest.fn((cb: (t: unknown) => unknown) => cb(prisma));
  }
  return prisma;
}

function makeService(prisma: unknown) {
  return new WorkflowStepService(
    prisma as never,
    { record: jest.fn() } as never,
    new RoleAssignmentLookup(prisma as never),
    new WorkflowQueryService(prisma as never),
  );
}

const draftDef = (over: Record<string, unknown> = {}) => ({
  id: 'def-1', code: 'PR_APPROVAL', name: 'PR Approval', description: null, version: 1,
  status: 'DRAFT', transactionType: 'PurchaseRequisition', createdBy: 'u1', ...over,
});

describe('WorkflowStepService — role & field divalidasi saat menulis', () => {
  it('rejects a step whose role does not exist', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
      role: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      makeService(prisma).addStep('def-1', { stepOrder: 1, name: 'Board', approverRoleCode: 'NOPE' } as never, 'u1'),
    ).rejects.toMatchObject({ response: { code: 'ROLE_NOT_FOUND' } });
  });

  it('rejects a condition field that is not known for the transaction type', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
    });
    await expect(
      makeService(prisma).addStep('def-1', {
        stepOrder: 1, name: 'Board', approverRoleCode: 'PROCUREMENT_MANAGER',
        conditionField: 'totallyMadeUp', conditionOp: '>', conditionValue: 1,
      } as never, 'u1'),
    ).rejects.toMatchObject({ response: { code: 'CONDITION_FIELD_UNKNOWN' } });
  });

  it('accepts a known field for the transaction type', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
    });
    await expect(
      makeService(prisma).addStep('def-1', {
        stepOrder: 1, name: 'Board', approverRoleCode: 'PROCUREMENT_MANAGER',
        conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000,
      } as never, 'u1'),
    ).resolves.toBeTruthy();
  });
});

describe('WorkflowStepService — struktur hanya boleh diubah saat DRAFT', () => {
  it('refuses to add a step to an ACTIVE workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef({ status: 'ACTIVE' })) },
    });
    await expect(
      makeService(prisma).addStep('def-1', { stepOrder: 1, name: 'x', approverRoleCode: 'PROCUREMENT_MANAGER' } as never, 'u1'),
    ).rejects.toMatchObject({ response: { code: 'NOT_DRAFT' } });
  });

  it('refuses to reorder steps of an ACTIVE workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: {
        ...makePrisma().workflowDefinition,
        findUnique: jest.fn().mockResolvedValue(draftDef({ status: 'ACTIVE', steps: [] })),
      },
    });
    await expect(makeService(prisma).reorderSteps('def-1', { stepIds: ['a'] }, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a reorder whose id list does not match the workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: {
        ...makePrisma().workflowDefinition,
        findUnique: jest.fn().mockResolvedValue(draftDef({ steps: [{ id: 'a' }, { id: 'b' }] })),
      },
    });
    await expect(makeService(prisma).reorderSteps('def-1', { stepIds: ['a', 'c'] }, 'u1')).rejects.toMatchObject({
      response: { code: 'REORDER_MISMATCH' },
    });
  });

  it('renumbers steps 1..n in the requested order', async () => {
    const calls: Array<{ id: string; stepOrder: number }> = [];
    const tx = {
      workflowStep: {
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: { stepOrder: number } }) => {
          calls.push({ id: where.id, stepOrder: data.stepOrder });
          return { id: where.id };
        }),
      },
    };
    const prisma = makePrisma({
      workflowDefinition: {
        ...makePrisma().workflowDefinition,
        findUnique: jest.fn().mockResolvedValue(draftDef({ steps: [{ id: 'a' }, { id: 'b' }] })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)),
    });
    await makeService(prisma).reorderSteps('def-1', { stepIds: ['b', 'a'] }, 'u1');

    const final = calls.filter((c) => c.stepOrder > 0);
    expect(final).toEqual([
      { id: 'b', stepOrder: 1 },
      { id: 'a', stepOrder: 2 },
    ]);
  });
});

describe('WorkflowStepService — syarat majemuk', () => {
  const group = {
    combinator: 'AND' as const,
    conditions: [
      { field: 'estimatedTotal', op: '>' as const, value: 5_000_000 },
      { field: 'estimatedTotal', op: '<=' as const, value: 50_000_000 },
    ],
  };

  it('mirrors the first rule into the single columns when a group is written', async () => {
    const create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'step-new', ...data }));
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
      workflowStep: { ...makePrisma().workflowStep, create },
    });

    await makeService(prisma).addStep('def-1', { stepOrder: 1, name: 'Board', approverRoleCode: 'PROCUREMENT_MANAGER', conditionGroup: group } as never, 'u1');

    const data = create.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.conditionField).toBe('estimatedTotal');
    expect(data.conditionOp).toBe('>');
    expect(data.conditionValue).toBe(5_000_000);
    expect(data.conditionGroup).toEqual({ combinator: 'AND', conditions: group.conditions });
  });

  it('rejects a group whose field is not known for the transaction type', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
    });
    await expect(
      makeService(prisma).addStep('def-1', {
        stepOrder: 1,
        name: 'Board',
        approverRoleCode: 'PROCUREMENT_MANAGER',
        conditionGroup: { combinator: 'AND', conditions: [{ field: 'madeUp', op: '>', value: 1 }] },
      } as never, 'u1'),
    ).rejects.toMatchObject({ response: { code: 'CONDITION_FIELD_UNKNOWN' } });
  });
});

describe('WorkflowStepService — update & remove', () => {
  it('throws STEP_NOT_FOUND when the step is not part of the definition', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
      workflowStep: { ...makePrisma().workflowStep, findUnique: jest.fn().mockResolvedValue({ id: 'other', definitionId: 'x' }) },
    });
    await expect(makeService(prisma).removeStep('def-1', 's1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
