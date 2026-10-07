import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { BulkDecideResponse } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { ConditionEvaluator } from './shared/condition-evaluator';
import { RoleAssignmentLookup } from './shared/role-assignment.lookup';
import { WorkflowQueryService } from './shared/workflow-query.service';
import type { ApproveTaskDto, BulkDecideDto, SubmitForApprovalDto } from '../../presentation/dto/approval.dto';

/**
 * Mesin rantai approval: submit dokumen, buka langkah berikutnya, dan putuskan
 * (tunggal maupun massal). Invarian yang dijaga di sini:
 * - submit hanya untuk DRAFT, idempoten (tak boleh submit dua kali);
 * - maker-checker (BR-003) berlaku terhadap PEMOHON, bukan approver sebelumnya;
 * - keputusan memakai compare-and-set (`updateMany` ber-guard `PENDING`);
 * - penolakan wajib beralasan dan membatalkan sisa langkah yang menunggu.
 */
@Injectable()
export class ApprovalWorkflowEngine {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ConditionEvaluator) private readonly evaluator: ConditionEvaluator,
    @Inject(RoleAssignmentLookup) private readonly roles: RoleAssignmentLookup,
    @Inject(WorkflowQueryService) private readonly workflow: WorkflowQueryService,
  ) {}

  private async resolveApproverId(approverRoleCode: string, actorId: string) {
    const role = await this.roles.findRoleOrNotFound(approverRoleCode);
    const assignment = await this.roles.findActiveAssignment(role.id);
    if (!assignment) throw new ConflictException({ code: 'NO_APPROVER', message: `No user holds role ${approverRoleCode}` });

    if (assignment.userId === actorId) {
      throw new ConflictException({ code: 'MAKER_CHECKER', message: 'Requester cannot be their own approver (BR-003)' });
    }
    return assignment.userId;
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

    const workflow = await this.workflow.getActiveDefinition(transactionType);
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
    if (!(await this.roles.hasRole(actorId, task.approverRoleCode))) {
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
    const workflow = await this.workflow.getActiveDefinition(task.transactionType);
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
    await this.roles.requireHolder(next.approverRoleCode, tx);

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
