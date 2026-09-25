import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { ConditionEvaluator } from './shared/condition-evaluator';
import type { ApproveTaskDto, SubmitForApprovalDto } from '../../presentation/dto/approval.dto';

/** Satu langkah approval yang berlaku untuk sebuah transaksi (snapshot saat submit). */
interface PlannedStep {
  stepOrder: number;
  name: string;
  approverRoleCode: string;
  /** Field/op transaksi untuk memetakan task step ini kembali ke transaksinya. */
  transactionType: string;
  transactionId: string;
}

const asPlannedSteps = (value: unknown): PlannedStep[] => {
  if (!Array.isArray(value)) return [];
  return value as PlannedStep[];
};

@Injectable()
export class ApprovalTaskService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ConditionEvaluator) private readonly evaluator: ConditionEvaluator,
  ) {}

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

  async getActiveDefinition(transactionType: string) {
    return this.prisma.workflowDefinition.findFirst({
      where: { transactionType, status: 'ACTIVE' },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Susun rencana step (pin versi) dari definisi aktif + dokumen, atau satu step implisit
   * dari `approverRoleCode` bila tidak ada definisi. Kondisi dievaluasi per-step memakai
   * `conditionField` step itu sendiri. Tiap langkah menyimpan `transactionType/transactionId`
   * supaya task step berikutnya bisa dibuat langsung dari snapshot tanpa menyentuh dokumen.
   */
  private async buildStepPlan(
    transactionType: string,
    transactionId: string,
    doc: Record<string, unknown>,
    fallbackRole: string,
  ): Promise<{ plan: PlannedStep[]; definitionId: string | null; definitionVersion: number | null }> {
    const ref = { transactionType, transactionId };
    const workflow = await this.getActiveDefinition(transactionType);
    if (!workflow) {
      return { plan: [{ stepOrder: 1, name: 'approval', approverRoleCode: fallbackRole, ...ref }], definitionId: null, definitionVersion: null };
    }

    const applicable = workflow.steps.filter((step) =>
      this.evaluator.evaluateCondition(step, this.evaluator.getDocValue(doc, step.conditionField)),
    );
    if (applicable.length === 0) {
      throw new ConflictException({ code: 'NO_APPLICABLE_STEP', message: 'Tidak ada step workflow yang berlaku untuk transaksi ini' });
    }

    // stepOrder dipertahankan apa adanya (boleh bolong bila ada step kondisional yang dilewati);
    // urutan eksekusi ditentukan oleh urutan menaik stepOrder.
    const plan = applicable
      .map((step) => ({ stepOrder: step.stepOrder, name: step.name, approverRoleCode: step.approverRoleCode, ...ref }))
      .sort((a, b) => a.stepOrder - b.stepOrder);

    return { plan, definitionId: workflow.id, definitionVersion: workflow.version };
  }

  async submitForApproval(dto: SubmitForApprovalDto, actorId: string) {
    const { transactionType, transactionId, transactionCode } = dto;

    const doc = await this.evaluator.getTransaction(transactionType, transactionId);
    if (!doc) throw new NotFoundException({ code: 'TRANSACTION_NOT_FOUND', message: 'Transaksi tidak ditemukan' });
    if ((doc as Record<string, unknown>).status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa disubmit (status saat ini ${(doc as Record<string, unknown>).status})` });
    }

    const { plan, definitionId, definitionVersion } = await this.buildStepPlan(
      transactionType,
      transactionId,
      doc as unknown as Record<string, unknown>,
      dto.approverRoleCode,
    );

    // Validasi approver untuk SETIAP step saat submit (fail fast): bila ada role tanpa user
    // atau yang terisi requester sendiri, transaksi tidak bisa maju sampai selesai.
    for (const step of plan) {
      await this.resolveApproverId(step.approverRoleCode, actorId);
    }

    const firstStep = plan[0]!;

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.approvalInstance.findUnique({ where: { transactionType_transactionId: { transactionType, transactionId } } });
      if (existing) throw new ConflictException({ code: 'ALREADY_SUBMITTED', message: 'Transaksi sudah disubmit untuk approval' });

      const instance = await tx.approvalInstance.create({
        data: {
          transactionType,
          transactionId,
          transactionCode: transactionCode ?? null,
          definitionId,
          definitionVersion,
          requesterId: actorId,
          status: 'PENDING',
          currentStepOrder: firstStep.stepOrder,
          stepPlan: plan as unknown as object,
        },
      });

      // Hanya step pertama yang dibuat sekarang; step berikutnya dibuat saat gilirannya tiba.
      const task = await tx.approvalTask.create({
        data: {
          instanceId: instance.id,
          transactionType,
          transactionId,
          transactionCode: transactionCode ?? null,
          stepOrder: firstStep.stepOrder,
          stepName: firstStep.name,
          approverRoleCode: firstStep.approverRoleCode,
          requesterId: actorId,
          status: 'PENDING',
        },
      });

      await this.evaluator.updateTransactionStatus(tx, transactionType, transactionId, 'SUBMITTED');
      return { instance, task };
    });

    await this.audit.record({
      userId: actorId,
      action: 'APPROVAL.SUBMIT',
      resource: transactionType,
      resourceId: transactionId,
      newValue: {
        instanceId: result.instance.id,
        taskId: result.task.id,
        steps: plan.map((s) => ({ stepOrder: s.stepOrder, approverRoleCode: s.approverRoleCode })),
        transactionCode,
        workflowCode: definitionId ? { definitionId, definitionVersion } : null,
      },
      source: 'api',
    });

    // Bentuk respons lama (id = task step pertama) dipertahankan + info instance.
    return { ...result.task, instanceId: result.instance.id, totalSteps: plan.length, currentStepOrder: firstStep.stepOrder };
  }

  async decide(dto: ApproveTaskDto, actorId: string) {
    const { taskId, decision, comment } = dto;
    const task = await this.prisma.approvalTask.findUnique({ where: { id: taskId }, include: { instance: true } });
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Approval task tidak ditemukan' });
    if (task.status !== 'PENDING') throw new ConflictException({ code: 'TASK_NOT_PENDING', message: 'Task sudah diputuskan' });
    if (task.requesterId === actorId) {
      throw new ConflictException({ code: 'MAKER_CHECKER', message: 'Requester tidak boleh approve transaksi sendiri (BR-003)' });
    }
    if (!(await this.hasRole(actorId, task.approverRoleCode))) {
      throw new ForbiddenException({ code: 'NOT_APPROVER', message: `Anda tidak punya role ${task.approverRoleCode}` });
    }

    const plan = asPlannedSteps(task.instance.stepPlan);
    const nextStep = plan.find((s) => s.stepOrder > task.stepOrder) ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      // CAS: dua approver paralel pada step yang sama tidak bisa sama-sama menang.
      const cas = await tx.approvalTask.updateMany({
        where: { id: taskId, status: 'PENDING' },
        data: {
          status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          approverId: actorId,
          comment: comment ?? null,
          decidedAt: new Date(),
        },
      });
      if (cas.count === 0) throw new ConflictException({ code: 'TASK_NOT_PENDING', message: 'Task sudah diputuskan' });

      if (decision === 'REJECT') {
        // Reject di step mana pun menghentikan alur: instance + transaksi jadi REJECTED.
        await tx.approvalInstance.update({
          where: { id: task.instanceId },
          data: { status: 'REJECTED', completedAt: new Date() },
        });
        await this.evaluator.updateTransactionStatus(tx, task.transactionType, task.transactionId, 'REJECTED');
        return { task: await tx.approvalTask.findUniqueOrThrow({ where: { id: taskId } }), advancedTo: null, nextTaskId: null };
      }

      if (nextStep) {
        // Masih ada step berikutnya: buat task step itu, instance tetap PENDING.
        const nextTask = await tx.approvalTask.create({
          data: {
            instanceId: task.instanceId,
            transactionType: task.transactionType,
            transactionId: task.transactionId,
            transactionCode: task.transactionCode,
            stepOrder: nextStep.stepOrder,
            stepName: nextStep.name,
            approverRoleCode: nextStep.approverRoleCode,
            requesterId: task.instance.requesterId,
            status: 'PENDING',
          },
        });
        await tx.approvalInstance.update({
          where: { id: task.instanceId },
          data: { currentStepOrder: nextStep.stepOrder },
        });
        // Transaksi belum APPROVED — baru setelah step terakhir.
        return {
          task: await tx.approvalTask.findUniqueOrThrow({ where: { id: taskId } }),
          advancedTo: nextStep,
          nextTaskId: nextTask.id,
        };
      }

      // Step terakhir APPROVED → instance + transaksi final APPROVED.
      await tx.approvalInstance.update({
        where: { id: task.instanceId },
        data: { status: 'APPROVED', completedAt: new Date() },
      });
      await this.evaluator.updateTransactionStatus(tx, task.transactionType, task.transactionId, 'APPROVED');
      return { task: await tx.approvalTask.findUniqueOrThrow({ where: { id: taskId } }), advancedTo: null, nextTaskId: null };
    });

    await this.audit.record({
      userId: actorId,
      action: decision === 'APPROVE' ? 'APPROVAL.APPROVE' : 'APPROVAL.REJECT',
      resource: task.transactionType,
      resourceId: task.transactionId,
      newValue: {
        taskId,
        instanceId: task.instanceId,
        stepOrder: task.stepOrder,
        decision,
        comment,
        advancedToStep: result.advancedTo?.stepOrder ?? null,
        final: result.advancedTo === null,
      },
      source: 'api',
    });

    // `nextTaskId` memberi pemanggil task step berikutnya tanpa perlu query ulang.
    return { ...result.task, nextTaskId: result.nextTaskId };
  }

  /**
   * Trace instance approval untuk sebuah transaksi beserta seluruh step-task-nya.
   * Dipakai untuk drill-down (§8 observabilitas) dan untuk mengambil task step yang aktif.
   */
  async getInstance(transactionType: string, transactionId: string) {
    const instance = await this.prisma.approvalInstance.findUnique({
      where: { transactionType_transactionId: { transactionType, transactionId } },
      include: { tasks: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!instance) throw new NotFoundException({ code: 'INSTANCE_NOT_FOUND', message: 'Instance approval tidak ditemukan' });

    const plan = asPlannedSteps(instance.stepPlan);
    const activeTask = instance.tasks.find((t) => t.status === 'PENDING') ?? null;

    return {
      instance,
      steps: plan.map((step) => {
        const task = instance.tasks.find((t) => t.stepOrder === step.stepOrder) ?? null;
        return {
          stepOrder: step.stepOrder,
          name: step.name,
          approverRoleCode: step.approverRoleCode,
          status: task?.status ?? 'PENDING',
          taskId: task?.id ?? null,
          approverId: task?.approverId ?? null,
          decidedAt: task?.decidedAt ?? null,
          comment: task?.comment ?? null,
        };
      }),
      activeTaskId: activeTask?.id ?? null,
    };
  }

  async listTasks(actorId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [tasks, total] = await Promise.all([
      this.prisma.approvalTask.findMany({ orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.approvalTask.count(),
    ]);

    const withActions = await Promise.all(
      tasks.map(async (task) => {
        const canApprove = task.status === 'PENDING' && task.requesterId !== actorId && (await this.hasRole(actorId, task.approverRoleCode));
        return { ...task, canApprove };
      }),
    );

    return { items: withActions, total };
  }
}
