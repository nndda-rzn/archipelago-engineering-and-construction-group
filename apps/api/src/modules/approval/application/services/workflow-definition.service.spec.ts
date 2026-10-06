import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkflowDefinitionService } from './workflow-definition.service';

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
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'def-new', ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'def-1', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      delete: jest.fn().mockResolvedValue({ id: 'def-1' }),
    },
    workflowStep: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'step-new', ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'step-1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'step-1' }),
    },
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1', code: 'PROCUREMENT_MANAGER' }) },
    userRole: { findFirst: jest.fn().mockResolvedValue({ userId: 'u1' }), count: jest.fn().mockResolvedValue(1) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
  // Transaksi meneruskan prisma yang sama sebagai `tx`, sehingga kode yang menulis
  // di dalam transaksi (mis. duplikasi langkah) berjalan seperti di produksi.
  // Override eksplisit dari test tetap dihormati.
  if (!overrides.$transaction) {
    prisma.$transaction = jest.fn((cb: (t: unknown) => unknown) => cb(prisma));
  }
  return prisma;
}

function makeService(prisma: unknown) {
  return new WorkflowDefinitionService(prisma as never, { record: jest.fn() } as never);
}

const draftDef = (over: Record<string, unknown> = {}) => ({
  id: 'def-1', code: 'PR_APPROVAL', name: 'PR Approval', description: null, version: 1,
  status: 'DRAFT', transactionType: 'PurchaseRequisition', createdBy: 'u1', ...over,
});

describe('WorkflowDefinitionService — role & field divalidasi saat menulis', () => {
  it('rejects a step whose role does not exist', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
      role: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const svc = makeService(prisma);
    await expect(
      svc.addStep('def-1', { stepOrder: 1, name: 'Board', approverRoleCode: 'NOPE' } as never, 'u1'),
    ).rejects.toMatchObject({ response: { code: 'ROLE_NOT_FOUND' } });
  });

  it('rejects a condition field that is not known for the transaction type', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
    });
    const svc = makeService(prisma);
    await expect(
      svc.addStep('def-1', {
        stepOrder: 1, name: 'Board', approverRoleCode: 'PROCUREMENT_MANAGER',
        conditionField: 'totallyMadeUp', conditionOp: '>', conditionValue: 1,
      } as never, 'u1'),
    ).rejects.toMatchObject({ response: { code: 'CONDITION_FIELD_UNKNOWN' } });
  });

  it('accepts a known field for the transaction type', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
    });
    const svc = makeService(prisma);
    await expect(
      svc.addStep('def-1', {
        stepOrder: 1, name: 'Board', approverRoleCode: 'PROCUREMENT_MANAGER',
        conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000,
      } as never, 'u1'),
    ).resolves.toBeTruthy();
  });
});

describe('WorkflowDefinitionService — struktur hanya boleh diubah saat DRAFT', () => {
  it('refuses to add a step to an ACTIVE workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef({ status: 'ACTIVE' })) },
    });
    const svc = makeService(prisma);
    await expect(
      svc.addStep('def-1', { stepOrder: 1, name: 'x', approverRoleCode: 'PROCUREMENT_MANAGER' } as never, 'u1'),
    ).rejects.toMatchObject({ response: { code: 'NOT_DRAFT' } });
  });

  it('refuses to reorder steps of an ACTIVE workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: {
        ...makePrisma().workflowDefinition,
        findUnique: jest.fn().mockResolvedValue(draftDef({ status: 'ACTIVE', steps: [] })),
      },
    });
    const svc = makeService(prisma);
    await expect(svc.reorderSteps('def-1', { stepIds: ['a'] }, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a reorder whose id list does not match the workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: {
        ...makePrisma().workflowDefinition,
        findUnique: jest.fn().mockResolvedValue(draftDef({ steps: [{ id: 'a' }, { id: 'b' }] })),
      },
    });
    const svc = makeService(prisma);
    await expect(svc.reorderSteps('def-1', { stepIds: ['a', 'c'] }, 'u1')).rejects.toMatchObject({
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
    const svc = makeService(prisma);
    await svc.reorderSteps('def-1', { stepIds: ['b', 'a'] }, 'u1');

    // Fase 1 memakai nilai negatif (menghindari unique constraint), fase 2 menormalkan.
    const final = calls.filter((c) => c.stepOrder > 0);
    expect(final).toEqual([
      { id: 'b', stepOrder: 1 },
      { id: 'a', stepOrder: 2 },
    ]);
  });
});

describe('WorkflowDefinitionService — publish memvalidasi sebelum aktif', () => {
  const publishable = draftDef({
    steps: [{ id: 's1', stepOrder: 1, name: 'Manager', approverRoleCode: 'PROCUREMENT_MANAGER' }],
  });

  it('refuses to publish when a role has no holder (the chain would stall)', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(publishable) },
      userRole: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0) },
    });
    const svc = makeService(prisma);
    await expect(svc.publishWorkflow('def-1', { newVersionName: 'PR Approval' }, 'u1')).rejects.toMatchObject({
      response: { code: 'WORKFLOW_NOT_READY' },
    });
  });

  it('refuses to publish a workflow with no steps', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef({ steps: [] })) },
    });
    const svc = makeService(prisma);
    await expect(svc.publishWorkflow('def-1', { newVersionName: 'x' }, 'u1')).rejects.toMatchObject({
      response: { code: 'NO_STEPS' },
    });
  });

  it('archives other ACTIVE versions of the same transaction type on publish', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      workflowDefinition: {
        updateMany,
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'def-1', ...data })),
      },
    };
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(publishable) },
      $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)),
    });
    const svc = makeService(prisma);
    await svc.publishWorkflow('def-1', { newVersionName: 'PR Approval v2' }, 'u1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { transactionType: 'PurchaseRequisition', status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });
  });
});

describe('WorkflowDefinitionService — hapus hanya bila belum dipakai runtime', () => {
  it('refuses to delete an ACTIVE workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef({ status: 'ACTIVE' })) },
    });
    const svc = makeService(prisma);
    await expect(svc.deleteWorkflow('def-1', 'u1')).rejects.toMatchObject({ response: { code: 'WORKFLOW_ACTIVE' } });
  });

  it('deletes a DRAFT workflow', async () => {
    const del = jest.fn().mockResolvedValue({ id: 'def-1' });
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef({ steps: [] })), delete: del },
    });
    const svc = makeService(prisma);
    await expect(svc.deleteWorkflow('def-1', 'u1')).resolves.toEqual({ deleted: 'def-1' });
    expect(del).toHaveBeenCalled();
  });

  it('refuses to archive a DRAFT workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
    });
    const svc = makeService(prisma);
    await expect(svc.archiveWorkflow('def-1', 'u1')).rejects.toMatchObject({ response: { code: 'NOT_ACTIVE' } });
  });
});

describe('WorkflowDefinitionService — diff versi', () => {
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
        findFirst: jest.fn()
          .mockResolvedValueOnce(from)
          .mockResolvedValueOnce(to),
      },
    });
    const svc = makeService(prisma);
    const diff = await svc.diffVersions('PR_APPROVAL', 1, 2);

    expect(diff.added.map((s) => s.stepOrder)).toEqual([3]);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.stepOrder).toBe(2);
    expect(diff.changed[0]!.fields.map((f) => f.field)).toContain('conditionField');
  });

  it('throws when a version does not exist', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    await expect(svc.diffVersions('PR_APPROVAL', 1, 9)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WorkflowDefinitionService — duplikasi definisi', () => {
  const source = {
    id: 'def-1', code: 'PR_APPROVAL', name: 'PR Approval', description: 'desc', version: 2,
    status: 'ACTIVE', transactionType: 'PurchaseRequisition', createdBy: 'u1',
    steps: [
      { stepOrder: 1, name: 'Manager', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
      { stepOrder: 2, name: 'Board', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 },
    ],
  };

  it('copies every step into a new DRAFT at version 1', async () => {
    const create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'def-copy', ...data }));
    const prisma = makePrisma({
      workflowDefinition: {
        ...makePrisma().workflowDefinition,
        findUnique: jest.fn().mockResolvedValue(source),
        findFirst: jest.fn().mockResolvedValue(null),
        create,
      },
    });
    const svc = makeService(prisma);

    const created = await svc.duplicateDefinition('def-1', { code: 'PR_APPROVAL_V2', name: 'Variant' } as never, 'u1');

    expect(created.id).toBe('def-copy');
    const data = create.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.code).toBe('PR_APPROVAL_V2');
    expect(data.status).toBe('DRAFT');
    expect(data.version).toBe(1);
    expect((data.steps as { create: unknown[] }).create).toHaveLength(2);
  });

  it('rejects a duplicate code', async () => {
    const prisma = makePrisma({
      workflowDefinition: {
        ...makePrisma().workflowDefinition,
        findUnique: jest.fn().mockResolvedValue(source),
        findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
      },
    });
    const svc = makeService(prisma);
    await expect(
      svc.duplicateDefinition('def-1', { code: 'PR_APPROVAL' } as never, 'u1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when the source definition does not exist', async () => {
    const svc = makeService(makePrisma());
    await expect(
      svc.duplicateDefinition('missing', { code: 'X_NEW' } as never, 'u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WorkflowDefinitionService — syarat majemuk', () => {
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
    const svc = makeService(prisma);

    await svc.addStep('def-1', { stepOrder: 1, name: 'Board', approverRoleCode: 'PROCUREMENT_MANAGER', conditionGroup: group } as never, 'u1');

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
    const svc = makeService(prisma);
    await expect(
      svc.addStep('def-1', {
        stepOrder: 1,
        name: 'Board',
        approverRoleCode: 'PROCUREMENT_MANAGER',
        conditionGroup: { combinator: 'AND', conditions: [{ field: 'madeUp', op: '>', value: 1 }] },
      } as never, 'u1'),
    ).rejects.toMatchObject({ response: { code: 'CONDITION_FIELD_UNKNOWN' } });
  });

  it('reads a stored group back as a group, not as raw JSON', async () => {
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
    const svc = makeService(prisma);
    const defs = await svc.listDefinitions();
    expect(defs[0]!.steps[0]!.conditionGroup).toEqual(group);
  });
});
