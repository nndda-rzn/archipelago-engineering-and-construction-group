import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { ConditionEvaluator } from './shared/condition-evaluator';
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

  async submitForApproval(dto: SubmitForApprovalDto, actorId: string) {
    const { transactionType, transactionId, transactionCode } = dto;

    const doc = await this.evaluator.getTransaction(transactionType, transactionId);
    if (!doc) throw new NotFoundException({ code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' });
    if ((doc as Record<string, unknown>).status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Only DRAFT can be submitted (current status ${(doc as Record<string, unknown>).status})` });
    }

    const workflow = await this.getActiveDefinition(transactionType);
    let approverRoleCode = dto.approverRoleCode;

    if (workflow) {
      const steps = workflow.steps;
      const firstStep = steps[0];
      const docValue = this.evaluator.getDocValue(doc as unknown as Record<string, unknown>, firstStep?.conditionField ?? null);
      const applicable = steps.filter((step) => this.evaluator.evaluateCondition(step, docValue));
      if (applicable.length === 0) {
        throw new ConflictException({ code: 'NO_APPLICABLE_STEP', message: 'No workflow step applies to this transaction' });
      }
      approverRoleCode = applicable[0]!.approverRoleCode;
    }

    await this.resolveApproverId(approverRoleCode, actorId);

    const task = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.approvalTask.findUnique({ where: { transactionType_transactionId: { transactionType, transactionId } } });
      if (existing) throw new ConflictException({ code: 'ALREADY_SUBMITTED', message: 'Transaction has already been submitted for approval' });

      const created = await tx.approvalTask.create({
        data: { transactionType, transactionId, transactionCode: transactionCode ?? null, approverRoleCode, requesterId: actorId, status: 'PENDING' },
      });

      await this.evaluator.updateTransactionStatus(tx, transactionType, transactionId, 'SUBMITTED');
      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'APPROVAL.SUBMIT',
      resource: transactionType,
      resourceId: transactionId,
      newValue: { taskId: task.id, approverRoleCode, transactionCode, workflowCode: workflow?.code ?? null },
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

      await this.evaluator.updateTransactionStatus(tx, task.transactionType, task.transactionId, nextStatus);
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

  /** Detail task + bukti dokumen + jejak keputusan. */
  async getDetail(taskId: string, actorId: string): Promise<ApprovalDetail> {
    const task = await this.prisma.approvalTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Approval task not found' });

    const roleCodes = await this.roleCodesOf(actorId);
    const document = await this.buildDocument(task.transactionType, task.transactionId);
    const history = await this.buildHistory(task.transactionType, task.transactionId);

    return {
      task: {
        ...(task as unknown as ApprovalDetail['task']),
        canApprove: task.status === 'PENDING' && task.requesterId !== actorId && roleCodes.includes(task.approverRoleCode),
      },
      document,
      history,
    };
  }

  private async buildDocument(transactionType: string, transactionId: string): Promise<ApprovalDocument> {
    if (transactionType === 'PurchaseRequisition') {
      const pr = await this.prisma.purchaseRequisition.findUnique({
        where: { id: transactionId },
        include: { project: { select: { code: true, name: true } }, items: true },
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
        })),
      };
    }
    if (transactionType === 'PurchaseOrder') {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: transactionId },
        include: { project: { select: { code: true, name: true } }, items: true },
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