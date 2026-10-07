import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { ConditionEvaluator } from './shared/condition-evaluator';
import { approvalConditionText } from './shared/approval-condition-text';
import { computeBudgetCheck } from '@/shared/project/budget-check';
import type {
  ApprovalCounts,
  ApprovalDetail,
  ApprovalDocument,
  ApprovalHistoryEntry,
  ApprovalQueueItem,
  BulkDecideResponse,
} from '@aec/api-contracts';
import type { ApproveTaskDto, BulkDecideDto, SubmitForApprovalDto } from '../../presentation/dto/approval.dto';

export interface ListTasksParams {
  status?: string;
  type?: string;
  q?: string;
  mine?: boolean;
  page: number;
  pageSize: number;
}

@Injectable()
export class ApprovalTaskService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ConditionEvaluator) private readonly evaluator: ConditionEvaluator,
  ) {}

  private async resolveApproverId(approverRoleCode: string, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { code: approverRoleCode } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: `Approver role ${approverRoleCode} not found` });

    const assignment = await this.prisma.userRole.findFirst({
      where: { roleId: role.id, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
      orderBy: { effectiveFrom: 'asc' },
    });
    if (!assignment) throw new ConflictException({ code: 'NO_APPROVER', message: `No user holds role ${approverRoleCode}` });

    if (assignment.userId === actorId) {
      throw new ConflictException({ code: 'MAKER_CHECKER', message: 'Requester cannot be their own approver (BR-003)' });
    }
    return assignment.userId;
  }

  private async hasRole(userId: string, roleCode: string) {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) return false;
    const assignment = await this.prisma.userRole.findFirst({
      where: { userId, roleId: role.id, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
    });
    return !!assignment;
  }

  async getActiveDefinition(transactionType: string) {
    return this.prisma.workflowDefinition.findFirst({
      where: { transactionType, status: 'ACTIVE' },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Langkah-langkah yang berlaku untuk sebuah dokumen, urut `stepOrder`.
   *
   * Kondisi dievaluasi terhadap NILAI DOKUMEN (mis. `totalAmount`), bukan terhadap
   * kondisi langkah sebelumnya — sehingga rantai "Manager lalu Direksi > 5jt"
   * benar-benar menyaring langkah yang tidak relevan.
   */
  private applicableSteps(
    workflow: { steps: Array<{ stepOrder: number; name: string; approverRoleCode: string; conditionField: string | null; conditionOp: string | null; conditionValue: unknown; conditionGroup?: unknown }> } | null,
    doc: Record<string, unknown>,
  ) {
    if (!workflow || workflow.steps.length === 0) return [];
    return workflow.steps
      .filter((step) => this.evaluator.evaluateCondition(
        step as unknown as { conditionField: string | null; conditionOp: string | null; conditionValue: never; conditionGroup?: never },
        this.evaluator.getDocValue(doc, step.conditionField),
        (field) => this.evaluator.getDocValue(doc, field),
      ))
      .sort((a, b) => a.stepOrder - b.stepOrder);
  }

  async submitForApproval(dto: SubmitForApprovalDto, actorId: string) {
    const { transactionType, transactionId, transactionCode } = dto;

    const doc = await this.evaluator.getTransaction(transactionType, transactionId);
    if (!doc) throw new NotFoundException({ code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' });
    if ((doc as Record<string, unknown>).status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Only DRAFT can be submitted (current status ${(doc as Record<string, unknown>).status})` });
    }

    const workflow = await this.getActiveDefinition(transactionType);
    const applicable = this.applicableSteps(workflow, doc as unknown as Record<string, unknown>);

    // Tanpa workflow: hormati role yang diminta pemanggil (perilaku lama).
    let firstStep: { stepOrder: number; name: string; approverRoleCode: string };
    if (workflow) {
      if (applicable.length === 0) {
        throw new ConflictException({ code: 'NO_APPLICABLE_STEP', message: 'No workflow step applies to this transaction' });
      }
      firstStep = applicable[0]!;
    } else {
      firstStep = { stepOrder: 1, name: 'approval', approverRoleCode: dto.approverRoleCode };
    }

    await this.resolveApproverId(firstStep.approverRoleCode, actorId);

    const task = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.approvalTask.findFirst({ where: { transactionType, transactionId, status: { in: ['PENDING', 'APPROVED'] } } });
      if (existing) throw new ConflictException({ code: 'ALREADY_SUBMITTED', message: 'Transaction has already been submitted for approval' });

      const created = await tx.approvalTask.create({
        data: {
          transactionType,
          transactionId,
          transactionCode: transactionCode ?? null,
          stepOrder: firstStep.stepOrder,
          stepName: firstStep.name,
          approverRoleCode: firstStep.approverRoleCode,
          requesterId: actorId,
          status: 'PENDING',
          // Versi yang benar-benar dipakai dokumen ini. `null` bila submit manual
          // tanpa workflow — bukan menebak.
          definitionId: workflow?.id ?? null,
        },
      });

      // Selalu SUBMITTED saat rantai dimulai — APPROVED hanya di langkah terakhir.
      await this.evaluator.updateTransactionStatus(tx, transactionType, transactionId, 'SUBMITTED');
      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'APPROVAL.SUBMIT',
      resource: transactionType,
      resourceId: transactionId,
      newValue: { taskId: task.id, approverRoleCode: firstStep.approverRoleCode, stepOrder: firstStep.stepOrder, transactionCode, workflowCode: workflow?.code ?? null },
      source: 'api',
    });

    return task;
  }

  async decide(dto: ApproveTaskDto, actorId: string) {
    const { taskId, decision, comment } = dto;
    // Invarian: penolakan tanpa alasan tidak berguna untuk pemohon maupun audit.
    this.assertRejectHasReason(decision, comment);
    const task = await this.prisma.approvalTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Approval task not found' });
    if (task.status !== 'PENDING') throw new ConflictException({ code: 'TASK_NOT_PENDING', message: 'Task has already been decided' });
    if (task.requesterId === actorId) {
      throw new ConflictException({ code: 'MAKER_CHECKER', message: 'Requester cannot approve their own transaction (BR-003)' });
    }
    if (!(await this.hasRole(actorId, task.approverRoleCode))) {
      throw new ForbiddenException({ code: 'NOT_APPROVER', message: `You do not hold role ${task.approverRoleCode}` });
    }

    const nextStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await this.prisma.$transaction(async (tx) => {
      // Compare-and-set: guard `status: 'PENDING'` membuat dua approver paralel tidak bisa
      // sama-sama menang. Pre-check di atas hanya jalur cepat untuk pesan error yang spesifik.
      const cas = await tx.approvalTask.updateMany({
        where: { id: taskId, status: 'PENDING' },
        data: { status: nextStatus, approverId: actorId, comment: comment ?? null, decidedAt: new Date() },
      });
      if (cas.count === 0) throw new ConflictException({ code: 'TASK_NOT_PENDING', message: 'Task has already been decided' });

      if (decision === 'REJECT') {
        // Ditolak di tengah rantai: hentikan dokumen dan batalkan sisa langkah yang
        // menunggu, supaya tidak ada task "hantu" yang bisa diputus setelahnya.
        await tx.approvalTask.updateMany({
          where: { transactionType: task.transactionType, transactionId: task.transactionId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await this.evaluator.updateTransactionStatus(tx, task.transactionType, task.transactionId, 'REJECTED');
        return tx.approvalTask.findUniqueOrThrow({ where: { id: taskId } });
      }

      // APPROVE: buka langkah berikutnya bila masih ada; kalau ini langkah terakhir,
      // dokumen baru menjadi APPROVED.
      const nextStep = await this.openNextStep(tx, task);
      if (!nextStep) {
        await this.evaluator.updateTransactionStatus(tx, task.transactionType, task.transactionId, 'APPROVED');
      }
      return tx.approvalTask.findUniqueOrThrow({ where: { id: taskId } });
    });

    await this.audit.record({
      userId: actorId,
      action: decision === 'APPROVE' ? 'APPROVAL.APPROVE' : 'APPROVAL.REJECT',
      resource: task.transactionType,
      resourceId: task.transactionId,
      newValue: { taskId, decision, comment },
      source: 'api',
    });

    return updated;
  }

  /**
   * Buat task untuk langkah applicable BERIKUTNYA (setelah `task.stepOrder`).
   * Mengembalikan task baru, atau `null` bila ini sudah langkah terakhir
   * (dokumen boleh menjadi APPROVED). Dipanggil di dalam transaksi `decide`.
   */
  private async openNextStep(
    tx: Prisma.TransactionClient,
    task: { transactionType: string; transactionId: string; transactionCode: string | null; stepOrder: number; requesterId: string },
  ) {
    const workflow = await this.getActiveDefinition(task.transactionType);
    if (!workflow) return null;

    const doc = await this.evaluator.getTransaction(task.transactionType, task.transactionId);
    if (!doc) return null;

    const applicable = this.applicableSteps(workflow, doc as unknown as Record<string, unknown>);
    const next = applicable.find((s) => s.stepOrder > task.stepOrder);
    if (!next) return null;

    // Pastikan role langkah berikutnya benar-benar dipegang seseorang, kalau tidak
    // rantai akan macet. Pesan errornya spesifik agar mudah ditindak.
    // Catatan: maker-checker (BR-003) berlaku terhadap PEMOHON, bukan terhadap
    // approver langkah sebelumnya — orang yang sama boleh memegang dua role
    // berurutan, jadi tidak ada pemeriksaan `actorId` di sini.
    const role = await tx.role.findUnique({ where: { code: next.approverRoleCode } });
    if (!role) throw new ConflictException({ code: 'ROLE_NOT_FOUND', message: `Approver role ${next.approverRoleCode} not found` });
    const assignment = await tx.userRole.findFirst({
      where: { roleId: role.id, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
    });
    if (!assignment) throw new ConflictException({ code: 'NO_APPROVER', message: `No user holds role ${next.approverRoleCode}` });

    return tx.approvalTask.create({
      data: {
        transactionType: task.transactionType,
        transactionId: task.transactionId,
        transactionCode: task.transactionCode,
        stepOrder: next.stepOrder,
        stepName: next.name,
        approverRoleCode: next.approverRoleCode,
        requesterId: task.requesterId,
        status: 'PENDING',
        // Langkah lanjutan memakai definisi yang sedang aktif saat dibuka. Bila
        // versi berganti di tengah rantai, tiap task tetap jujur menyebut versi
        // yang benar-benar membuatnya.
        definitionId: workflow.id,
      },
    });
  }

  async pendingCount(): Promise<number> {
    return this.prisma.approvalTask.count({ where: { status: 'PENDING' } });
  }

  /** Aturan tunggal untuk invarian "reject wajib beralasan" (dipakai decide & bulk). */
  private assertRejectHasReason(decision: string, comment?: string) {
    if (decision === 'REJECT' && !comment?.trim()) {
      throw new BadRequestException({
        code: 'REJECT_REASON_REQUIRED',
        message: 'A reason is required to reject',
        details: { field: 'comment' },
      });
    }
  }

  /** Role codes yang aktif dipegang user — dasar untuk menentukan `canApprove`. */
  private async roleCodesOf(userId: string): Promise<string[]> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
      include: { role: true },
    });
    return assignments.map((a) => a.role.code);
  }

  /** Status yang dipakai untuk tab inbox. `ALL` = tanpa filter. */
  private statusWhere(status?: string): Prisma.ApprovalTaskWhereInput {
    return !status || status === 'ALL' ? {} : { status };
  }

  async listTasks(actorId: string, params: ListTasksParams) {
    const { status, type, q, mine, page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    // "Mine" = hanya task yang benar-benar bisa diputuskan aktor: PENDING,
    // bukan pengaju sendiri (BR-003), dan role-nya dipegang aktor.
    const roleCodes = mine ? await this.roleCodesOf(actorId) : [];
    const mineWhere: Prisma.ApprovalTaskWhereInput = mine
      ? { status: 'PENDING', requesterId: { not: actorId }, approverRoleCode: { in: roleCodes } }
      : {};

    const where: Prisma.ApprovalTaskWhereInput = {
      ...this.statusWhere(status),
      ...(type ? { transactionType: type } : {}),
      ...(q ? { transactionCode: { contains: q, mode: 'insensitive' } } : {}),
      ...mineWhere,
    };

    const [tasks, total, groups] = await Promise.all([
      this.prisma.approvalTask.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.approvalTask.count({ where }),
      // Counts mengabaikan filter status (agar label tab selalu lengkap) tetapi
      // menghormati filter lain supaya angkanya konsisten dengan isi antrean.
      this.prisma.approvalTask.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { ...(type ? { transactionType: type } : {}), ...(q ? { transactionCode: { contains: q, mode: 'insensitive' } } : {}), ...mineWhere },
      }),
    ]);

    const counts = this.toCounts(groups);
    const items = await this.enrichQueue(tasks, actorId, roleCodes);

    return { items, total, counts };
  }

  private toCounts(groups: Array<{ status: string; _count: { _all: number } }>): ApprovalCounts {
    const byStatus = new Map(groups.map((g) => [g.status, g._count._all]));
    const pending = byStatus.get('PENDING') ?? 0;
    const approved = byStatus.get('APPROVED') ?? 0;
    const rejected = byStatus.get('REJECTED') ?? 0;
    return { PENDING: pending, APPROVED: approved, REJECTED: rejected, ALL: pending + approved + rejected };
  }

  /** Lengkapi baris antrean dengan konteks dokumen + hak putus aktor. */
  private async enrichQueue(
    tasks: Array<{ id: string; status: string; requesterId: string; approverRoleCode: string; transactionType: string; transactionId: string } & Record<string, unknown>>,
    actorId: string,
    knownRoleCodes: string[],
  ): Promise<ApprovalQueueItem[]> {
    if (tasks.length === 0) return [];
    const roleCodes = knownRoleCodes.length > 0 ? knownRoleCodes : await this.roleCodesOf(actorId);

    const prIds = tasks.filter((t) => t.transactionType === 'PurchaseRequisition').map((t) => t.transactionId);
    const poIds = tasks.filter((t) => t.transactionType === 'PurchaseOrder').map((t) => t.transactionId);
    const requesterIds = [...new Set(tasks.map((t) => t.requesterId))];

    const [prs, pos, users] = await Promise.all([
      prIds.length
        ? this.prisma.purchaseRequisition.findMany({
            where: { id: { in: prIds } },
            include: { project: { select: { code: true, name: true } } },
          })
        : Promise.resolve([]),
      poIds.length
        ? this.prisma.purchaseOrder.findMany({
            where: { id: { in: poIds } },
            include: { project: { select: { code: true, name: true } } },
          })
        : Promise.resolve([]),
      requesterIds.length
        ? this.prisma.user.findMany({ where: { id: { in: requesterIds } }, select: { id: true, displayName: true } })
        : Promise.resolve([]),
    ]);

    const prById = new Map(prs.map((p) => [p.id, p]));
    const poById = new Map(pos.map((p) => [p.id, p]));
    const userById = new Map(users.map((u) => [u.id, u.displayName]));

    return tasks.map((task) => {
      const pr = task.transactionType === 'PurchaseRequisition' ? prById.get(task.transactionId) : undefined;
      const po = task.transactionType === 'PurchaseOrder' ? poById.get(task.transactionId) : undefined;
      const project = pr?.project ?? po?.project ?? null;
      const amount = pr?.estimatedTotal != null ? Number(pr.estimatedTotal) : po?.totalAmount != null ? Number(po.totalAmount) : null;
      const canApprove =
        task.status === 'PENDING' && task.requesterId !== actorId && roleCodes.includes(task.approverRoleCode);
      return {
        ...(task as unknown as ApprovalQueueItem),
        projectCode: project?.code ?? null,
        projectName: project?.name ?? null,
        amount,
        requesterName: userById.get(task.requesterId) ?? null,
        canApprove,
      };
    });
  }

  /** Detail task + bukti dokumen + konteks keputusan + jejak. */
  async getDetail(taskId: string, actorId: string): Promise<ApprovalDetail> {
    const task = await this.prisma.approvalTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Approval task not found' });

    const roleCodes = await this.roleCodesOf(actorId);
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
    const workflow = await this.getActiveDefinition(transactionType);
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

  /**
   * Keputusan massal. Daftar task dari klien TIDAK dipercaya: tiap task
   * divalidasi ulang (ada, masih PENDING, bukan milik sendiri, role cocok)
   * dan keputusannya dijalankan lewat jalur `decide` yang sama. Hasil per item
   * sehingga satu kegagalan tidak menggagalkan seluruh batch.
   */
  async bulkDecide(dto: BulkDecideDto, actorId: string): Promise<BulkDecideResponse> {
    this.assertRejectHasReason(dto.decision, dto.comment);
    const results = [];
    for (const taskId of dto.taskIds) {
      try {
        await this.decide({ taskId, decision: dto.decision, comment: dto.comment }, actorId);
        results.push({ taskId, ok: true, code: null, message: null });
      } catch (error) {
        const code =
          error instanceof BadRequestException || error instanceof ConflictException || error instanceof ForbiddenException || error instanceof NotFoundException
            ? (error.getResponse() as { code?: string }).code ?? 'ERROR'
            : 'ERROR';
        const message = error instanceof Error ? error.message : 'Failed';
        results.push({ taskId, ok: false, code, message });
      }
    }
    const succeeded = results.filter((r) => r.ok).length;
    return { results, succeeded, failed: results.length - succeeded };
  }
}