import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { ApproveTaskDto, SubmitForApprovalDto } from './dto/approval.dto';

// FR-FND-007: approval workflow (MVP) + BR-003 (maker-checker), BR-007 (PO tidak release tanpa valid approval)
@Injectable()
export class ApprovalService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async resolveApproverId(approverRoleCode: string, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { code: approverRoleCode } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: `Role approver ${approverRoleCode} tidak ada` });

    const assignment = await this.prisma.userRole.findFirst({
      where: { roleId: role.id, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
      orderBy: { effectiveFrom: 'asc' },
    });
    if (!assignment) throw new ConflictException({ code: 'NO_APPROVER', message: `Tidak ada user dengan role ${approverRoleCode}` });

    if (assignment.userId === actorId) {
      throw new ConflictException({ code: 'MAKER_CHECKER', message: 'Requester tidak boleh menjadi approver sendiri (BR-003)' });
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

  // ─── Submit → buat ApprovalTask ─────────────────────────────────────────────

  async submitForApproval(dto: SubmitForApprovalDto, actorId: string) {
    const { transactionType, transactionId, approverRoleCode, transactionCode } = dto;

    const doc = await this.getTransaction(transactionType, transactionId);
    if (!doc) throw new NotFoundException({ code: 'TRANSACTION_NOT_FOUND', message: 'Transaksi tidak ditemukan' });
    if (doc.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa disubmit (status saat ini ${doc.status})` });
    }

    // maker-checker setup: pastikan ada approver selain requester
    await this.resolveApproverId(approverRoleCode, actorId);

    const task = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.approvalTask.findUnique({ where: { transactionType_transactionId: { transactionType, transactionId } } });
      if (existing) throw new ConflictException({ code: 'ALREADY_SUBMITTED', message: 'Transaksi sudah disubmit untuk approval' });

      const created = await tx.approvalTask.create({
        data: {
          transactionType,
          transactionId,
          transactionCode: transactionCode ?? null,
          approverRoleCode,
          requesterId: actorId,
          status: 'PENDING',
        },
      });

      // transisi dokumen DRAFT → SUBMITTED
      await this.updateTransactionStatus(tx, transactionType, transactionId, 'SUBMITTED');
      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'APPROVAL.SUBMIT',
      resource: transactionType,
      resourceId: transactionId,
      newValue: { taskId: task.id, approverRoleCode, transactionCode },
      source: 'api',
    });

    return task;
  }

  // ─── Approve / Reject ───────────────────────────────────────────────────────

  async decide(dto: ApproveTaskDto, actorId: string) {
    const { taskId, decision, comment } = dto;
    const task = await this.prisma.approvalTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Approval task tidak ditemukan' });
    if (task.status !== 'PENDING') throw new ConflictException({ code: 'TASK_NOT_PENDING', message: 'Task sudah diputuskan' });
    if (task.requesterId === actorId) {
      throw new ConflictException({ code: 'MAKER_CHECKER', message: 'Requester tidak boleh approve transaksi sendiri (BR-003)' });
    }
    if (!(await this.hasRole(actorId, task.approverRoleCode))) {
      throw new ForbiddenException({ code: 'NOT_APPROVER', message: `Anda tidak punya role ${task.approverRoleCode}` });
    }

    const nextStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await this.prisma.$transaction(async (tx) => {
      const decided = await tx.approvalTask.update({
        where: { id: taskId },
        data: { status: nextStatus, approverId: actorId, comment: comment ?? null, decidedAt: new Date() },
      });

      // transisi dokumen: SUBMITTED → APPROVED / REJECTED
      await this.updateTransactionStatus(tx, task.transactionType, task.transactionId, nextStatus);
      return decided;
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

  // ─── List task ──────────────────────────────────────────────────────────────

  async listTasks(actorId: string) {
    const [tasks, pending] = await Promise.all([
      this.prisma.approvalTask.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.approvalTask.count({ where: { status: 'PENDING' } }),
    ]);

    // anotasi: task yang bisa di-approve user ini (role match + bukan requester)
    const withActions = await Promise.all(
      tasks.map(async (task) => {
        const canApprove = task.status === 'PENDING' && task.requesterId !== actorId && (await this.hasRole(actorId, task.approverRoleCode));
        return { ...task, canApprove };
      }),
    );

    return { items: withActions, total: pending };
  }

  // ─── Transaksi status helper ────────────────────────────────────────────────

  private async getTransaction(transactionType: string, transactionId: string) {
    switch (transactionType) {
      case 'PurchaseRequisition':
        return this.prisma.purchaseRequisition.findUnique({ where: { id: transactionId } });
      case 'PurchaseOrder':
        return this.prisma.purchaseOrder.findUnique({ where: { id: transactionId } });
      default:
        throw new BadRequestException({ code: 'UNSUPPORTED_TYPE', message: `Tipe ${transactionType} belum didukung` });
    }
  }

  private async updateTransactionStatus(tx: Prisma.TransactionClient, transactionType: string, transactionId: string, status: string) {
    switch (transactionType) {
      case 'PurchaseRequisition':
        return tx.purchaseRequisition.update({ where: { id: transactionId }, data: { status } });
      case 'PurchaseOrder':
        return tx.purchaseOrder.update({ where: { id: transactionId }, data: { status } });
      default:
        throw new BadRequestException({ code: 'UNSUPPORTED_TYPE', message: `Tipe ${transactionType} belum didukung` });
    }
  }
}
