import { ApprovalDetailService } from './approval-detail.service';
import { ConditionEvaluator } from './shared/condition-evaluator';
import { RoleAssignmentLookup } from './shared/role-assignment.lookup';
import { WorkflowQueryService } from './shared/workflow-query.service';

/**
 * Mock prisma minimal: hanya method yang benar-benar dipakai service. Tipenya
 * sengaja longgar karena tiap test mengganti sebagian model dengan objek lebih
 * kecil; service di-construct dengan `as never`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock test yang diganti sebagian per-kasus
function makePrisma(overrides: Record<string, unknown> = {}): any {
  return {
    approvalTask: { findUnique: jest.fn().mockResolvedValue(null) },
    workflowDefinition: { findFirst: jest.fn().mockResolvedValue(null) },
    userRole: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
    role: { findUnique: jest.fn().mockResolvedValue(null) },
    purchaseRequisition: { findUnique: jest.fn().mockResolvedValue(null), aggregate: jest.fn().mockResolvedValue({ _sum: { estimatedTotal: 0 } }) },
    purchaseOrder: { findUnique: jest.fn().mockResolvedValue(null), aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }) },
    subcontract: { aggregate: jest.fn().mockResolvedValue({ _sum: { contractValue: 0 } }) },
    budgetItem: { count: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
    project: { findUnique: jest.fn().mockResolvedValue(null) },
    vendor: { findFirst: jest.fn().mockResolvedValue(null) },
    vendorPerformanceRating: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

function makeService(prisma: unknown) {
  const evaluator = new ConditionEvaluator(prisma as never);
  const roles = new RoleAssignmentLookup(prisma as never);
  const workflow = new WorkflowQueryService(prisma as never);
  return new ApprovalDetailService(prisma as never, evaluator, roles, workflow);
}

describe('ApprovalDetailService.getDetail — konteks keputusan', () => {
  function detailPrisma() {
    const prisma = makePrisma();
    prisma.approvalTask.findUnique = jest.fn().mockResolvedValue({
      id: 't1', transactionType: 'PurchaseOrder', transactionId: 'po1', transactionCode: 'PO-1',
      stepOrder: 2, stepName: 'Approval Direksi', status: 'PENDING', requesterId: 'u-other', approverRoleCode: 'SUPER_ADMIN',
    });
    prisma.role.findUnique = jest.fn().mockResolvedValue({ id: 'r', code: 'SUPER_ADMIN' });
    prisma.userRole.findMany = jest.fn().mockResolvedValue([{ role: { code: 'SUPER_ADMIN' } }]);
    prisma.purchaseOrder.findUnique = jest.fn().mockResolvedValue({
      id: 'po1', poNumber: 'PO-1', totalAmount: 150_000_000, currency: 'IDR', vendor: 'PT Baja', projectId: 'prj1', status: 'SUBMITTED',
      project: { code: 'PRJ-01', name: 'Tower B' },
      items: [{ description: 'Baja', quantity: 10, unit: 'ton', unitPrice: 15_000_000, totalPrice: 150_000_000, wbsItem: { code: '1.1' } }],
      requisition: null, goodsReceipts: [], vendorInvoices: [],
    });
    prisma.workflowDefinition.findFirst = jest.fn().mockResolvedValue({
      code: 'PO_APPROVAL',
      steps: [
        { stepOrder: 1, name: 'Manager', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
        { stepOrder: 2, name: 'Direksi', approverRoleCode: 'SUPER_ADMIN', conditionField: 'totalAmount', conditionOp: '>', conditionValue: 5_000_000 },
      ],
    });
    prisma.budgetItem = { count: jest.fn().mockResolvedValue(2), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 720_000_000 } }) };
    prisma.purchaseOrder.aggregate = jest.fn().mockResolvedValue({ _sum: { totalAmount: 150_000_000 } });
    prisma.subcontract = { aggregate: jest.fn().mockResolvedValue({ _sum: { contractValue: 0 } }) };
    prisma.purchaseRequisition.aggregate = jest.fn().mockResolvedValue({ _sum: { estimatedTotal: 0 } });
    prisma.project.findUnique = jest.fn().mockResolvedValue({
      code: 'PRJ-01', name: 'Tower B', client: 'PT Klien', status: 'ACTIVE', contractValue: 5_000_000_000,
      startDate: new Date('2026-01-01'), completionDate: new Date('2027-01-01'), location: 'Jakarta', manager: 'Budi',
      budgetItems: [{ costType: 'MATERIAL', amount: 300_000_000 }, { costType: 'LABOR', amount: 100_000_000 }],
    });
    prisma.vendor = { findFirst: jest.fn().mockResolvedValue({ id: 'v1', name: 'PT Baja', category: 'MATERIAL', taxId: '01.234', contactPerson: 'Sari' }) };
    prisma.vendorPerformanceRating = { findMany: jest.fn().mockResolvedValue([{ score: 4 }, { score: 5 }]) };
    prisma.auditLog.findMany = jest.fn().mockResolvedValue([]);
    return prisma;
  }

  it('returns budget context with the SAME formula used for PR validation', async () => {
    const svc = makeService(detailPrisma());
    const res = await svc.getDetail('t1', 'u1');
    expect(res.budget).toMatchObject({ budget: 720_000_000, commitment: 150_000_000, remaining: 570_000_000 });
  });

  it('marks the chain step states from the task stepOrder (no guessing)', async () => {
    const svc = makeService(detailPrisma());
    const res = await svc.getDetail('t1', 'u1');
    expect(res.chain?.map((c) => c.status)).toEqual(['done', 'current']);
    expect(res.chain?.[1]?.condition).toContain('totalAmount');
  });

  it('includes project, vendor and per-item WBS attribution', async () => {
    const svc = makeService(detailPrisma());
    const res = await svc.getDetail('t1', 'u1');
    expect(res.project?.baselineByCostType[0]).toEqual({ costType: 'MATERIAL', amount: 300_000_000 });
    expect(res.vendor).toMatchObject({ name: 'PT Baja', avgRating: 4.5, ratingCount: 2 });
    expect(res.document.items[0]?.wbsCode).toBe('1.1');
  });

  it('degrades honestly: no workflow -> chain null; no published budget -> budget null; no vendor record -> rating null', async () => {
    const prisma = detailPrisma();
    prisma.workflowDefinition.findFirst = jest.fn().mockResolvedValue(null);
    prisma.budgetItem.count = jest.fn().mockResolvedValue(0);
    prisma.vendor.findFirst = jest.fn().mockResolvedValue(null);
    const svc = makeService(prisma);
    const res = await svc.getDetail('t1', 'u1');
    expect(res.chain).toBeNull();
    expect(res.budget).toBeNull();
    expect(res.vendor).toMatchObject({ name: 'PT Baja', avgRating: null, ratingCount: 0 });
  });
});
