import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ApprovalDetail, ApprovalDocument, ApprovalHistoryEntry } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { computeBudgetCheck } from '@/shared/project/budget-check';
import { ConditionEvaluator } from './shared/condition-evaluator';
import { RoleAssignmentLookup } from './shared/role-assignment.lookup';
import { WorkflowQueryService } from './shared/workflow-query.service';
import { approvalConditionText } from './shared/approval-condition-text';

/**
 * Read-model detail task: bukti dokumen, konteks keputusan (budget, chain,
 * proyek, vendor, dokumen terkait), dan jejak audit. Dipisah dari
 * `ApprovalTaskService` supaya penulisan (submit/decide) dan pembacaan detail
 * tidak lagi tinggal di kelas yang sama.
 *
 * Aturan degradasi jujur: tanpa workflow → `chain` null; tanpa budget
 * terpublikasi → `budget` null; vendor tanpa record → `avgRating` null. UI yang
 * menandainya, bukan service yang mengarang nilai.
 */
@Injectable()
export class ApprovalDetailService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConditionEvaluator) private readonly evaluator: ConditionEvaluator,
    @Inject(RoleAssignmentLookup) private readonly roles: RoleAssignmentLookup,
    @Inject(WorkflowQueryService) private readonly workflow: WorkflowQueryService,
  ) {}

  /** Detail task + bukti dokumen + konteks keputusan + jejak. */
  async getDetail(taskId: string, actorId: string): Promise<ApprovalDetail> {
    const task = await this.prisma.approvalTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Approval task not found' });

    const roleCodes = await this.roles.roleCodesOf(actorId);
    const document = await this.buildDocument(task.transactionType, task.transactionId);

    const projectId = await this.projectIdOf(task.transactionType, task.transactionId);
    const [budget, chain, project, vendor, related, history] = await Promise.all([
      projectId ? this.buildBudget(projectId) : Promise.resolve(null),
      this.buildChain(task.transactionType, task.stepOrder),
      projectId ? this.buildProjectContext(projectId) : Promise.resolve(null),
      this.buildVendor(task.transactionType, task.transactionId),
      this.buildRelated(task.transactionType, task.transactionId),
      this.buildHistory(task.transactionType, task.transactionId),
    ]);

    return {
      task: {
        ...(task as unknown as ApprovalDetail['task']),
        canApprove: task.status === 'PENDING' && task.requesterId !== actorId && roleCodes.includes(task.approverRoleCode),
      },
      document,
      history,
      budget,
      chain,
      project,
      vendor,
      related,
    };
  }

  private async projectIdOf(transactionType: string, transactionId: string): Promise<string | null> {
    if (transactionType === 'PurchaseRequisition') {
      const pr = await this.prisma.purchaseRequisition.findUnique({ where: { id: transactionId }, select: { projectId: true } });
      return pr?.projectId ?? null;
    }
    if (transactionType === 'PurchaseOrder') {
      const po = await this.prisma.purchaseOrder.findUnique({ where: { id: transactionId }, select: { projectId: true } });
      return po?.projectId ?? null;
    }
    return null;
  }

  /** Konteks budget proyek — rumusnya sama dengan validasi pembuatan PR (FR-PRO-002). */
  private async buildBudget(projectId: string): Promise<ApprovalDetail['budget']> {
    const hasBudget = await this.prisma.budgetItem.count({ where: { projectId, status: 'PUBLISHED' } });
    if (hasBudget === 0) return null;
    const check = await computeBudgetCheck(this.prisma, projectId, 0);
    return { budget: check.budget, commitment: check.commitment, existingPr: check.existingPr, remaining: check.remaining, within: check.within };
  }

  /**
   * Rantai approval dari definisi AKTIF + posisi task ini. `status` tiap langkah
   * diturunkan dari `stepOrder` task — bukan ditebak. Bila definisi tidak ada
   * (mis. submit manual tanpa workflow) → `null`, dan UI menandainya "custom".
   */
  private async buildChain(transactionType: string, currentStepOrder: number): Promise<ApprovalDetail['chain']> {
    const workflow = await this.workflow.getActiveDefinition(transactionType);
    if (!workflow || workflow.steps.length === 0) return null;
    return workflow.steps.map((s) => ({
      stepOrder: s.stepOrder,
      name: s.name,
      approverRoleCode: s.approverRoleCode,
      condition: approvalConditionText(s),
      status: s.stepOrder < currentStepOrder ? 'done' : s.stepOrder === currentStepOrder ? 'current' : 'upcoming',
    }));
  }

  private async buildProjectContext(projectId: string): Promise<ApprovalDetail['project']> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { budgetItems: { where: { status: 'PUBLISHED' } } },
    });
    if (!project) return null;

    const byCost = new Map<string, number>();
    for (const item of project.budgetItems) {
      byCost.set(item.costType, (byCost.get(item.costType) ?? 0) + Number(item.amount));
    }
    const baselineByCostType = [...byCost.entries()]
      .map(([costType, amount]) => ({ costType, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      code: project.code,
      name: project.name,
      client: project.client,
      status: project.status,
      contractValue: project.contractValue != null ? Number(project.contractValue) : null,
      startDate: project.startDate?.toISOString() ?? null,
      completionDate: project.completionDate?.toISOString() ?? null,
      location: project.location,
      manager: project.manager,
      baselineByCostType,
    };
  }

  /** Vendor hanya relevan untuk PO (dokumen PO menyimpan nama vendor). */
  private async buildVendor(transactionType: string, transactionId: string): Promise<ApprovalDetail['vendor']> {
    if (transactionType !== 'PurchaseOrder') return null;
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: transactionId }, select: { vendor: true } });
    if (!po?.vendor) return null;
    const vendor = await this.prisma.vendor.findFirst({ where: { name: po.vendor } });
    if (!vendor) return { name: po.vendor, category: null, taxId: null, contactPerson: null, avgRating: null, ratingCount: 0 };

    const ratings = await this.prisma.vendorPerformanceRating.findMany({ where: { vendorId: vendor.id }, select: { score: true } });
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : null;
    return {
      name: vendor.name,
      category: vendor.category,
      taxId: vendor.taxId,
      contactPerson: vendor.contactPerson,
      avgRating: avg,
      ratingCount: ratings.length,
    };
  }

  /**
   * Dokumen terkait dari relasi nyata (PR↔PO↔GR/Invoice). Hanya tautan — TIDAK
   * mengklaim status "matched", karena 3-way match belum dihitung di sistem ini.
   */
  private async buildRelated(transactionType: string, transactionId: string): Promise<ApprovalDetail['related']> {
    if (transactionType === 'PurchaseRequisition') {
      const pr = await this.prisma.purchaseRequisition.findUnique({
        where: { id: transactionId },
        include: { purchaseOrders: { select: { poNumber: true, status: true } } },
      });
      return (pr?.purchaseOrders ?? []).map((po) => ({ type: 'PurchaseOrder', code: po.poNumber, status: po.status }));
    }
    if (transactionType === 'PurchaseOrder') {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: transactionId },
        include: {
          requisition: { select: { prNumber: true, status: true } },
          goodsReceipts: { select: { grNumber: true, status: true } },
          vendorInvoices: { select: { invoiceNumber: true, status: true } },
        },
      });
      if (!po) return [];
      const rows: Array<{ type: string; code: string; status: string }> = [];
      if (po.requisition) rows.push({ type: 'PurchaseRequisition', code: po.requisition.prNumber, status: po.requisition.status });
      for (const gr of po.goodsReceipts) rows.push({ type: 'GoodsReceipt', code: gr.grNumber, status: gr.status });
      for (const inv of po.vendorInvoices) rows.push({ type: 'VendorInvoice', code: inv.invoiceNumber, status: inv.status });
      return rows;
    }
    return [];
  }

  private async buildDocument(transactionType: string, transactionId: string): Promise<ApprovalDocument> {
    if (transactionType === 'PurchaseRequisition') {
      const pr = await this.prisma.purchaseRequisition.findUnique({
        where: { id: transactionId },
        include: { project: { select: { code: true, name: true } }, items: true, wbsItem: { select: { code: true } } },
      });
      if (!pr) return this.emptyDocument(transactionType);
      const requesterName = await this.nameOf(pr.requestedBy);
      return {
        type: transactionType,
        code: pr.prNumber,
        amount: pr.estimatedTotal != null ? Number(pr.estimatedTotal) : null,
        currency: 'IDR',
        description: pr.description,
        projectCode: pr.project?.code ?? null,
        projectName: pr.project?.name ?? null,
        vendor: null,
        requesterName,
        items: pr.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit: i.unit,
          unitPrice: i.estimatedUnitPrice != null ? Number(i.estimatedUnitPrice) : null,
          totalPrice: i.estimatedTotal != null ? Number(i.estimatedTotal) : null,
          wbsCode: pr.wbsItem?.code ?? null,
        })),
      };
    }
    if (transactionType === 'PurchaseOrder') {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: transactionId },
        include: { project: { select: { code: true, name: true } }, items: { include: { wbsItem: { select: { code: true } } } } },
      });
      if (!po) return this.emptyDocument(transactionType);
      return {
        type: transactionType,
        code: po.poNumber,
        amount: Number(po.totalAmount),
        currency: po.currency,
        description: null,
        projectCode: po.project?.code ?? null,
        projectName: po.project?.name ?? null,
        vendor: po.vendor,
        requesterName: null,
        items: po.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit: i.unit,
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
          wbsCode: i.wbsItem?.code ?? null,
        })),
      };
    }
    return this.emptyDocument(transactionType);
  }

  private emptyDocument(type: string): ApprovalDocument {
    return {
      type,
      code: null,
      amount: null,
      currency: null,
      description: null,
      projectCode: null,
      projectName: null,
      vendor: null,
      requesterName: null,
      items: [],
    };
  }

  private async nameOf(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    return user?.displayName ?? null;
  }

  private async buildHistory(transactionType: string, transactionId: string): Promise<ApprovalHistoryEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { resource: transactionType, resourceId: transactionId, action: { startsWith: 'APPROVAL.' } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    const actorIds = [...new Set(logs.map((l) => l.userId))];
    const users = actorIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true } })
      : [];
    const userById = new Map(users.map((u) => [u.id, u.displayName]));
    return logs.map((l) => {
      const value = (l.newValue ?? {}) as { comment?: unknown };
      return {
        action: l.action,
        actorId: l.userId,
        actorName: userById.get(l.userId) ?? null,
        comment: typeof value.comment === 'string' ? value.comment : null,
        at: l.createdAt.toISOString(),
      };
    });
  }
}
