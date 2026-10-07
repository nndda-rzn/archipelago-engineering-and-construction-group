import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkflowLifecycleService } from './workflow-lifecycle.service';
import { RoleAssignmentLookup } from './shared/role-assignment.lookup';
import { WorkflowQueryService } from './shared/workflow-query.service';

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
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1', code: 'PROCUREMENT_MANAGER' }) },
    userRole: { findFirst: jest.fn().mockResolvedValue({ userId: 'u1' }), count: jest.fn().mockResolvedValue(1) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
  if (!overrides.$transaction) {
    prisma.$transaction = jest.fn((cb: (t: unknown) => unknown) => cb(prisma));
  }
  return prisma;
}

function makeService(prisma: unknown) {
  return new WorkflowLifecycleService(
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

describe('WorkflowLifecycleService — publish memvalidasi sebelum aktif', () => {
  const publishable = draftDef({
    steps: [{ id: 's1', stepOrder: 1, name: 'Manager', approverRoleCode: 'PROCUREMENT_MANAGER' }],
  });

  it('refuses to publish when a role has no holder (the chain would stall)', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(publishable) },
      userRole: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0) },
    });
    await expect(makeService(prisma).publishWorkflow('def-1', { newVersionName: 'PR Approval' }, 'u1')).rejects.toMatchObject({
      response: { code: 'WORKFLOW_NOT_READY' },
    });
  });

  it('refuses to publish a workflow with no steps', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef({ steps: [] })) },
    });
    await expect(makeService(prisma).publishWorkflow('def-1', { newVersionName: 'x' }, 'u1')).rejects.toMatchObject({
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
    await makeService(prisma).publishWorkflow('def-1', { newVersionName: 'PR Approval v2' }, 'u1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { transactionType: 'PurchaseRequisition', status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });
  });
});

describe('WorkflowLifecycleService — arsip & hapus', () => {
  it('refuses to delete an ACTIVE workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef({ status: 'ACTIVE' })) },
    });
    await expect(makeService(prisma).deleteWorkflow('def-1', 'u1')).rejects.toMatchObject({ response: { code: 'WORKFLOW_ACTIVE' } });
  });

  it('deletes a DRAFT workflow', async () => {
    const del = jest.fn().mockResolvedValue({ id: 'def-1' });
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef({ steps: [] })), delete: del },
    });
    await expect(makeService(prisma).deleteWorkflow('def-1', 'u1')).resolves.toEqual({ deleted: 'def-1' });
    expect(del).toHaveBeenCalled();
  });

  it('refuses to archive a DRAFT workflow', async () => {
    const prisma = makePrisma({
      workflowDefinition: { ...makePrisma().workflowDefinition, findUnique: jest.fn().mockResolvedValue(draftDef()) },
    });
    await expect(makeService(prisma).archiveWorkflow('def-1', 'u1')).rejects.toMatchObject({ response: { code: 'NOT_ACTIVE' } });
  });
});

describe('WorkflowLifecycleService — duplikasi definisi', () => {
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

    const created = await makeService(prisma).duplicateDefinition('def-1', { code: 'PR_APPROVAL_V2', name: 'Variant' } as never, 'u1');

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
    await expect(makeService(prisma).duplicateDefinition('def-1', { code: 'PR_APPROVAL' } as never, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when the source definition does not exist', async () => {
    await expect(makeService(makePrisma()).duplicateDefinition('missing', { code: 'X_NEW' } as never, 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
