import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CONDITION_FIELDS, type ConditionGroup } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { RoleAssignmentLookup } from './shared/role-assignment.lookup';
import { WorkflowQueryService } from './shared/workflow-query.service';
import { toNumber, toConditionGroup, toJsonInput, mirrorFirstCondition } from './shared/condition-group-mapper';
import type {
  AddWorkflowStepDto,
  ReorderWorkflowStepsDto,
  UpdateWorkflowStepDto,
} from '../../presentation/dto/approval.dto';

/**
 * Menulis langkah di dalam sebuah definisi workflow: tambah, ubah, hapus, dan
 * ubah urutan. Struktur hanya boleh berubah saat DRAFT. Dipisah dari lifecycle
 * (publish/version) dan dari read-model definisi.
 */
@Injectable()
export class WorkflowStepService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(RoleAssignmentLookup) private readonly roles: RoleAssignmentLookup,
    @Inject(WorkflowQueryService) private readonly workflow: WorkflowQueryService,
  ) {}

  /** Field kondisi harus berasal dari daftar yang dikenal untuk jenis transaksi ini. */
  private assertConditionFieldAllowed(transactionType: string, field: string) {
    const allowed = CONDITION_FIELDS[transactionType];
    if (!allowed || !allowed.includes(field)) {
      throw new ConflictException({
        code: 'CONDITION_FIELD_UNKNOWN',
        message: `Field "${field}" cannot be used for ${transactionType}`,
      });
    }
  }

  /** Setiap field di dalam grup syarat juga harus dikenal untuk jenis transaksi ini. */
  private assertGroupFieldsAllowed(transactionType: string, group: ConditionGroup) {
    for (const condition of group.conditions) {
      this.assertConditionFieldAllowed(transactionType, condition.field);
    }
  }

  private async loadDraftStep(definitionId: string, stepId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({ where: { id: definitionId } });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });
    if (definition.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: 'Steps can only be changed while in DRAFT' });
    }
    const step = await this.prisma.workflowStep.findUnique({ where: { id: stepId } });
    if (!step || step.definitionId !== definitionId) {
      throw new NotFoundException({ code: 'STEP_NOT_FOUND', message: 'Workflow step not found' });
    }
    return { definition, step };
  }

  async addStep(id: string, dto: AddWorkflowStepDto, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });
    if (definition.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: 'Steps can only be added while in DRAFT' });
    }

    await this.roles.assertRoleExists(dto.approverRoleCode);
    if (dto.conditionGroup) this.assertGroupFieldsAllowed(definition.transactionType, dto.conditionGroup as ConditionGroup);
    else if (dto.conditionField) this.assertConditionFieldAllowed(definition.transactionType, dto.conditionField);

    const existing = await this.prisma.workflowStep.findUnique({ where: { definitionId_stepOrder: { definitionId: id, stepOrder: dto.stepOrder } } });
    if (existing) throw new ConflictException({ code: 'STEP_EXISTS', message: `Step order ${dto.stepOrder} already exists` });

    const mirror = mirrorFirstCondition(dto.conditionGroup as ConditionGroup | null | undefined);
    const step = await this.prisma.workflowStep.create({
      data: {
        definitionId: id,
        stepOrder: dto.stepOrder,
        name: dto.name,
        approverRoleCode: dto.approverRoleCode,
        // Grup menang bila ada; kolom tunggal menjadi cerminannya.
        conditionField: dto.conditionGroup ? mirror.conditionField : dto.conditionField ?? null,
        conditionOp: dto.conditionGroup ? mirror.conditionOp : dto.conditionOp ?? null,
        conditionValue: dto.conditionGroup ? mirror.conditionValue : dto.conditionValue ?? null,
        conditionGroup: toJsonInput(dto.conditionGroup as ConditionGroup | null | undefined),
      },
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.ADD_STEP', resource: 'Workflow', resourceId: id,
      newValue: { code: definition.code, stepOrder: dto.stepOrder, approverRoleCode: dto.approverRoleCode }, source: 'api',
    });

    return { ...step, conditionValue: toNumber(step.conditionValue), conditionGroup: toConditionGroup(step.conditionGroup) };
  }

  async updateStep(definitionId: string, stepId: string, dto: UpdateWorkflowStepDto, actorId: string) {
    const { definition, step } = await this.loadDraftStep(definitionId, stepId);

    if (dto.approverRoleCode) await this.roles.assertRoleExists(dto.approverRoleCode);
    if (dto.conditionGroup) this.assertGroupFieldsAllowed(definition.transactionType, dto.conditionGroup as ConditionGroup);
    else if (dto.conditionField) this.assertConditionFieldAllowed(definition.transactionType, dto.conditionField);

    // Grup menang bila dikirim: kolom tunggal diturunkan darinya, bukan sebaliknya.
    const groupProvided = dto.conditionGroup !== undefined;
    const mirror = groupProvided ? mirrorFirstCondition(dto.conditionGroup as ConditionGroup | null) : null;

    const updated = await this.prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.approverRoleCode !== undefined ? { approverRoleCode: dto.approverRoleCode } : {}),
        ...(groupProvided
          ? {
              conditionGroup: dto.conditionGroup == null ? Prisma.DbNull : toJsonInput(dto.conditionGroup as ConditionGroup)!,
              conditionField: mirror!.conditionField,
              conditionOp: mirror!.conditionOp,
              conditionValue: mirror!.conditionValue,
            }
          : {
              ...(dto.conditionField !== undefined ? { conditionField: dto.conditionField } : {}),
              ...(dto.conditionOp !== undefined ? { conditionOp: dto.conditionOp } : {}),
              ...(dto.conditionValue !== undefined ? { conditionValue: dto.conditionValue } : {}),
            }),
      },
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.UPDATE_STEP', resource: 'Workflow', resourceId: definitionId,
      oldValue: { stepId, name: step.name, approverRoleCode: step.approverRoleCode },
      newValue: { stepId, name: updated.name, approverRoleCode: updated.approverRoleCode }, source: 'api',
    });

    return { ...updated, conditionValue: toNumber(updated.conditionValue), conditionGroup: toConditionGroup(updated.conditionGroup) };
  }

  async removeStep(definitionId: string, stepId: string, actorId: string) {
    const { step } = await this.loadDraftStep(definitionId, stepId);

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowStep.delete({ where: { id: stepId } });
      // Rapatkan urutan agar tidak ada lubang (mis. 1, 3) yang membingungkan.
      const remaining = await tx.workflowStep.findMany({
        where: { definitionId }, orderBy: { stepOrder: 'asc' },
      });
      for (const [index, s] of remaining.entries()) {
        const target = index + 1;
        if (s.stepOrder !== target) {
          await tx.workflowStep.update({ where: { id: s.id }, data: { stepOrder: -target } });
        }
      }
      const staged = await tx.workflowStep.findMany({ where: { definitionId }, orderBy: { stepOrder: 'desc' } });
      for (const s of staged) {
        if (s.stepOrder < 0) await tx.workflowStep.update({ where: { id: s.id }, data: { stepOrder: -s.stepOrder } });
      }
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.REMOVE_STEP', resource: 'Workflow', resourceId: definitionId,
      oldValue: { stepId, stepOrder: step.stepOrder, name: step.name }, source: 'api',
    });

    return { removed: stepId };
  }

  /**
   * Ubah urutan langkah. `@@unique([definitionId, stepOrder])` melarang dua baris
   * bernilai sama, jadi pertukaran harus lewat nilai sementara (negatif) di dalam
   * satu transaksi, baru dinormalkan ke 1..n.
   */
  async reorderSteps(id: string, dto: ReorderWorkflowStepsDto, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id }, include: { steps: true },
    });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });
    if (definition.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: 'Steps can only be reordered while in DRAFT' });
    }

    const currentIds = definition.steps.map((s) => s.id).sort();
    const nextIds = [...dto.stepIds].sort();
    if (currentIds.length !== nextIds.length || currentIds.some((v, i) => v !== nextIds[i])) {
      throw new ConflictException({ code: 'REORDER_MISMATCH', message: 'Step list does not match the workflow' });
    }

    await this.prisma.$transaction(async (tx) => {
      // Fase 1: pindahkan ke nilai negatif agar tidak menabrak unique constraint.
      for (const [index, stepId] of dto.stepIds.entries()) {
        await tx.workflowStep.update({ where: { id: stepId }, data: { stepOrder: -(index + 1) } });
      }
      // Fase 2: normalisasi ke 1..n mengikuti urutan yang diminta.
      for (const [index, stepId] of dto.stepIds.entries()) {
        await tx.workflowStep.update({ where: { id: stepId }, data: { stepOrder: index + 1 } });
      }
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.REORDER_STEPS', resource: 'Workflow', resourceId: id,
      newValue: { code: definition.code, order: dto.stepIds }, source: 'api',
    });

    return this.workflow.listWithMeta({ id });
  }
}
