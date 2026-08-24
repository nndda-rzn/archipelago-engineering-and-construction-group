import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { AddWorkflowStepDto, ApproveTaskDto, CreateWorkflowDefinitionDto, PublishWorkflowDto, SubmitForApprovalDto } from './dto/approval.dto';

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

  // ─── Workflow definition & versioning (FR-FND-007 full) ────────────────────

  async createDefinition(dto: CreateWorkflowDefinitionDto, actorId: string) {
    const existing = await this.prisma.workflowDefinition.findFirst({ where: { code: dto.code } });
    if (existing) throw new ConflictException({ code: 'WORKFLOW_EXISTS', message: `Workflow ${dto.code} sudah ada` });

    const definition = await this.prisma.workflowDefinition.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        version: 1,
        status: dto.status ?? 'DRAFT',
        transactionType: dto.transactionType,
        createdBy: actorId,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Workflow.CREATE',
      resource: 'Workflow',
      resourceId: definition.id,
      newValue: { code: dto.code, version: 1, transactionType: dto.transactionType },
      source: 'api',
    });

    return definition;
  }

  async listDefinitions() {
    return this.prisma.workflowDefinition.findMany({
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
  }

  async getActiveDefinition(transactionType: string) {
    return this.prisma.workflowDefinition.findFirst({
      where: { transactionType, status: 'ACTIVE' },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { version: 'desc' },
    });
  }

  async addStep(id: string, dto: AddWorkflowStepDto, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow tidak ditemukan' });
    if (definition.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: 'Step hanya bisa ditambah saat DRAFT' });
    }

    const existing = await this.prisma.workflowStep.findUnique({
      where: { definitionId_stepOrder: { definitionId: id, stepOrder: dto.stepOrder } },
    });
    if (existing) throw new ConflictException({ code: 'STEP_EXISTS', message: `Step order ${dto.stepOrder} sudah ada` });

    const step = await this.prisma.workflowStep.create({
      data: {
        definitionId: id,
        stepOrder: dto.stepOrder,
        name: dto.name,
        approverRoleCode: dto.approverRoleCode,
        conditionField: dto.conditionField ?? null,
        conditionOp: dto.conditionOp ?? null,
        conditionValue: dto.conditionValue ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Workflow.ADD_STEP',
      resource: 'Workflow',
      resourceId: id,
      newValue: { code: definition.code, stepOrder: dto.stepOrder, approverRoleCode: dto.approverRoleCode },
      source: 'api',
    });

    return step;
  }

  async publishWorkflow(id: string, dto: PublishWorkflowDto, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow tidak ditemukan' });
    if (definition.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: 'Hanya DRAFT yang bisa di-publish' });
    }
    if (definition.steps.length === 0) {
      throw new ConflictException({ code: 'NO_STEPS', message: 'Workflow harus punya minimal 1 step' });
    }

    const published = await this.prisma.$transaction(async (tx) => {
      await tx.workflowDefinition.updateMany({
        where: { transactionType: definition.transactionType, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      });
      const updated = await tx.workflowDefinition.update({
        where: { id },
        data: { status: 'ACTIVE', name: dto.newVersionName, description: dto.description ?? definition.description },
      });
      return updated;
    });

    await this.audit.record({
      userId: actorId,
      action: 'Workflow.PUBLISH',
      resource: 'Workflow',
      resourceId: id,
      newValue: { code: definition.code, version: definition.version, transactionType: definition.transactionType },
      source: 'api',
    });

    return published;
  }

  async createNewVersion(code: string, actorId: string) {
    const latest = await this.prisma.workflowDefinition.findFirst({
      where: { code },
      include: { steps: true },
      orderBy: { version: 'desc' },
    });
    if (!latest) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: `Workflow ${code} tidak ada` });

    const newVersion = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workflowDefinition.create({
        data: {
          code,
          name: `${latest.name} v${latest.version + 1}`,
          description: latest.description,
          version: latest.version + 1,
          status: 'DRAFT',
          transactionType: latest.transactionType,
          createdBy: actorId,
          steps: {
            create: latest.steps
              .sort((a, b) => a.stepOrder - b.stepOrder)
              .map((s) => ({
                stepOrder: s.stepOrder,
                name: s.name,
                approverRoleCode: s.approverRoleCode,
                conditionField: s.conditionField,
                conditionOp: s.conditionOp,
                conditionValue: s.conditionValue,
              })),
          },
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'Workflow.NEW_VERSION',
      resource: 'Workflow',
      resourceId: newVersion.id,
      newValue: { code, version: newVersion.version },
      source: 'api',
    });

    return newVersion;
  }

  // Evaluate conditional step routing
  private evaluateCondition(step: { conditionField: string | null; conditionOp: string | null; conditionValue: Prisma.Decimal | null }, docValue: number | null): boolean {
    if (!step.conditionField || !step.conditionOp || step.conditionValue == null || docValue == null) return true;
    const threshold = Number(step.conditionValue);
    switch (step.conditionOp) {
      case '>': return docValue > threshold;
      case '<': return docValue < threshold;
      case '>=': return docValue >= threshold;
      case '<=': return docValue <= threshold;
      case '==': return docValue === threshold;
      default: return true;
    }
  }

  // Ambil nilai field untuk condition (totalAmount dll)
  private getDocValue(doc: Record<string, unknown>, field: string | null): number | null {
    if (!field) return null;
    const value = (doc as Record<string, unknown>)[field];
    if (value == null) return null;
    return Number(value);
  }

  // ─── Submit → buat ApprovalTask ─────────────────────────────────────────────

  async submitForApproval(dto: SubmitForApprovalDto, actorId: string) {
    const { transactionType, transactionId, transactionCode } = dto;

    const doc = await this.getTransaction(transactionType, transactionId);
    if (!doc) throw new NotFoundException({ code: 'TRANSACTION_NOT_FOUND', message: 'Transaksi tidak ditemukan' });
    if (doc.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa disubmit (status saat ini ${doc.status})` });
    }

    // Resolve workflow: prefer ACTIVE definition, fallback manual approverRoleCode
    const workflow = await this.getActiveDefinition(transactionType);
    let approverRoleCode = dto.approverRoleCode;

    if (workflow) {
      const steps = workflow.steps;
      const firstStep = steps[0];
      const docValue = this.getDocValue(doc as unknown as Record<string, unknown>, firstStep?.conditionField ?? null);
      const applicable = steps.filter((step) => this.evaluateCondition(step, docValue));
      if (applicable.length === 0) {
        throw new ConflictException({ code: 'NO_APPLICABLE_STEP', message: 'Tidak ada step workflow yang berlaku untuk transaksi ini' });
      }
      approverRoleCode = applicable[0]!.approverRoleCode;
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
      newValue: { taskId: task.id, approverRoleCode, transactionCode, workflowCode: workflow?.code ?? null },
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
