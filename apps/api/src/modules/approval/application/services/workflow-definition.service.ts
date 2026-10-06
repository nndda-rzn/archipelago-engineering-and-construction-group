import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { CONDITION_FIELDS } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  AddWorkflowStepDto,
  CreateWorkflowDefinitionDto,
  PublishWorkflowDto,
  ReorderWorkflowStepsDto,
  UpdateWorkflowDefinitionDto,
  UpdateWorkflowStepDto,
} from '../../presentation/dto/approval.dto';

/** Ambang yang dipakai langkah (Decimal di DB) → number untuk kontrak. */
function toNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

@Injectable()
export class WorkflowDefinitionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /**
   * Definisi + nama pembuat + `updatedAt`. Prisma mengembalikan `conditionValue`
   * sebagai Decimal (string), jadi dikonversi eksplisit agar lolos kontrak
   * (`z.number()`).
   */
  private async listWithMeta(where: Prisma.WorkflowDefinitionWhereInput = {}) {
    const definitions = await this.prisma.workflowDefinition.findMany({
      where,
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
    const creatorIds = [...new Set(definitions.map((d) => d.createdBy))];
    const users = creatorIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, displayName: true } })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.displayName]));

    return definitions.map((d) => ({
      ...d,
      createdByName: nameById.get(d.createdBy) ?? null,
      steps: d.steps.map((s) => ({ ...s, conditionValue: toNumber(s.conditionValue) })),
    }));
  }

  async createDefinition(dto: CreateWorkflowDefinitionDto, actorId: string) {
    const existing = await this.prisma.workflowDefinition.findFirst({ where: { code: dto.code } });
    if (existing) throw new ConflictException({ code: 'WORKFLOW_EXISTS', message: `Workflow ${dto.code} already exists` });

    const definition = await this.prisma.workflowDefinition.create({
      data: { code: dto.code, name: dto.name, description: dto.description ?? null, version: 1, status: dto.status ?? 'DRAFT', transactionType: dto.transactionType, createdBy: actorId },
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.CREATE', resource: 'Workflow', resourceId: definition.id,
      newValue: { code: dto.code, version: 1, transactionType: dto.transactionType }, source: 'api',
    });

    return definition;
  }

  async listDefinitions() {
    return this.listWithMeta();
  }

  /** Pastikan role yang dipakai benar-benar ada — dicek saat menulis, bukan saat submit. */
  private async assertRoleExists(roleCode: string) {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new ConflictException({ code: 'ROLE_NOT_FOUND', message: `Approver role ${roleCode} not found` });
  }

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

  async addStep(id: string, dto: AddWorkflowStepDto, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });
    if (definition.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: 'Steps can only be added while in DRAFT' });
    }

    await this.assertRoleExists(dto.approverRoleCode);
    if (dto.conditionField) this.assertConditionFieldAllowed(definition.transactionType, dto.conditionField);

    const existing = await this.prisma.workflowStep.findUnique({ where: { definitionId_stepOrder: { definitionId: id, stepOrder: dto.stepOrder } } });
    if (existing) throw new ConflictException({ code: 'STEP_EXISTS', message: `Step order ${dto.stepOrder} already exists` });

    const step = await this.prisma.workflowStep.create({
      data: { definitionId: id, stepOrder: dto.stepOrder, name: dto.name, approverRoleCode: dto.approverRoleCode, conditionField: dto.conditionField ?? null, conditionOp: dto.conditionOp ?? null, conditionValue: dto.conditionValue ?? null },
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.ADD_STEP', resource: 'Workflow', resourceId: id,
      newValue: { code: definition.code, stepOrder: dto.stepOrder, approverRoleCode: dto.approverRoleCode }, source: 'api',
    });

    return { ...step, conditionValue: toNumber(step.conditionValue) };
  }

  /** Ubah nama/description. Diizinkan pada DRAFT maupun ACTIVE (properti dasar). */
  async updateDefinition(id: string, dto: UpdateWorkflowDefinitionDto, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });

    const updated = await this.prisma.workflowDefinition.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.UPDATE', resource: 'Workflow', resourceId: id,
      oldValue: { name: definition.name, description: definition.description },
      newValue: { name: updated.name, description: updated.description }, source: 'api',
    });

    return updated;
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

  async updateStep(definitionId: string, stepId: string, dto: UpdateWorkflowStepDto, actorId: string) {
    const { definition, step } = await this.loadDraftStep(definitionId, stepId);

    if (dto.approverRoleCode) await this.assertRoleExists(dto.approverRoleCode);
    if (dto.conditionField) this.assertConditionFieldAllowed(definition.transactionType, dto.conditionField);

    const updated = await this.prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.approverRoleCode !== undefined ? { approverRoleCode: dto.approverRoleCode } : {}),
        ...(dto.conditionField !== undefined ? { conditionField: dto.conditionField } : {}),
        ...(dto.conditionOp !== undefined ? { conditionOp: dto.conditionOp } : {}),
        ...(dto.conditionValue !== undefined ? { conditionValue: dto.conditionValue } : {}),
      },
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.UPDATE_STEP', resource: 'Workflow', resourceId: definitionId,
      oldValue: { stepId, name: step.name, approverRoleCode: step.approverRoleCode },
      newValue: { stepId, name: updated.name, approverRoleCode: updated.approverRoleCode }, source: 'api',
    });

    return { ...updated, conditionValue: toNumber(updated.conditionValue) };
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

    return this.listWithMeta({ id });
  }

  async publishWorkflow(id: string, dto: PublishWorkflowDto, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id }, include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });
    if (definition.status !== 'DRAFT') throw new ConflictException({ code: 'NOT_DRAFT', message: 'Only DRAFT can be published' });
    if (definition.steps.length === 0) throw new ConflictException({ code: 'NO_STEPS', message: 'Workflow must have at least 1 step' });

    // Validasi sebelum aktif: role harus ada DAN dipegang seseorang. Tanpa ini,
    // rantai baru macet saat user menekan Submit — jauh dari tempat kesalahannya.
    const problems: string[] = [];
    for (const step of definition.steps) {
      const role = await this.prisma.role.findUnique({ where: { code: step.approverRoleCode } });
      if (!role) {
        problems.push(`Step ${step.stepOrder}: role ${step.approverRoleCode} does not exist`);
        continue;
      }
      const holder = await this.prisma.userRole.findFirst({
        where: { roleId: role.id, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
      });
      if (!holder) problems.push(`Step ${step.stepOrder}: no user holds ${step.approverRoleCode}`);
    }
    if (problems.length > 0) {
      throw new ConflictException({
        code: 'WORKFLOW_NOT_READY',
        message: 'Workflow cannot be published yet',
        details: { problems },
      });
    }

    const published = await this.prisma.$transaction(async (tx) => {
      await tx.workflowDefinition.updateMany({ where: { transactionType: definition.transactionType, status: 'ACTIVE' }, data: { status: 'ARCHIVED' } });
      return tx.workflowDefinition.update({ where: { id }, data: { status: 'ACTIVE', name: dto.newVersionName, description: dto.description ?? definition.description } });
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.PUBLISH', resource: 'Workflow', resourceId: id,
      newValue: { code: definition.code, version: definition.version, transactionType: definition.transactionType }, source: 'api',
    });

    return published;
  }

  /** Arsipkan definisi ACTIVE tanpa membuat versi baru. */
  async archiveWorkflow(id: string, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });
    if (definition.status !== 'ACTIVE') {
      throw new ConflictException({ code: 'NOT_ACTIVE', message: 'Only an ACTIVE workflow can be archived' });
    }

    const archived = await this.prisma.workflowDefinition.update({ where: { id }, data: { status: 'ARCHIVED' } });

    await this.audit.record({
      userId: actorId, action: 'Workflow.ARCHIVE', resource: 'Workflow', resourceId: id,
      newValue: { code: definition.code, version: definition.version }, source: 'api',
    });

    return archived;
  }

  /**
   * Hapus definisi. Hanya DRAFT/ARCHIVED — definisi ACTIVE sedang dipakai runtime
   * dan menghapusnya akan membuat submit PR/PO gagal.
   */
  async deleteWorkflow(id: string, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id }, include: { steps: true },
    });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });
    if (definition.status === 'ACTIVE') {
      throw new ConflictException({ code: 'WORKFLOW_ACTIVE', message: 'Archive the workflow before deleting it' });
    }

    await this.prisma.workflowDefinition.delete({ where: { id } });

    await this.audit.record({
      userId: actorId, action: 'Workflow.DELETE', resource: 'Workflow', resourceId: id,
      oldValue: { code: definition.code, version: definition.version, status: definition.status }, source: 'api',
    });

    return { deleted: id };
  }

  async createNewVersion(code: string, actorId: string) {
    const latest = await this.prisma.workflowDefinition.findFirst({
      where: { code }, include: { steps: true }, orderBy: { version: 'desc' },
    });
    if (!latest) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: `Workflow ${code} not found` });

    const newVersion = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workflowDefinition.create({
        data: {
          // Nama tidak menyisipkan nomor versi: versi sudah punya kolom dan badge
          // sendiri, jadi menaruhnya di nama hanya menduplikasi sinyal.
          code, name: latest.name, description: latest.description, version: latest.version + 1,
          status: 'DRAFT', transactionType: latest.transactionType, createdBy: actorId,
          steps: { create: latest.steps.sort((a, b) => a.stepOrder - b.stepOrder).map((s) => ({ stepOrder: s.stepOrder, name: s.name, approverRoleCode: s.approverRoleCode, conditionField: s.conditionField, conditionOp: s.conditionOp, conditionValue: s.conditionValue })) },
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      return created;
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.NEW_VERSION', resource: 'Workflow', resourceId: newVersion.id,
      newValue: { code, version: newVersion.version }, source: 'api',
    });

    return newVersion;
  }

  /** Semua versi satu `code`, terbaru lebih dulu, lengkap dengan status aktif. */
  async listVersions(code: string) {
    const definitions = await this.listWithMeta({ code });
    if (definitions.length === 0) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: `Workflow ${code} not found` });

    return definitions
      .map((d) => ({
        id: d.id,
        code: d.code,
        version: d.version,
        status: d.status,
        name: d.name,
        stepCount: d.steps.length,
        createdByName: d.createdByName,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        isActive: d.status === 'ACTIVE',
      }))
      .sort((a, b) => b.version - a.version);
  }

  /** Bandingkan dua versi berdasarkan nomor versi. */
  async diffVersions(code: string, fromVersion: number, toVersion: number) {
    const [from, to] = await Promise.all([
      this.prisma.workflowDefinition.findFirst({ where: { code, version: fromVersion }, include: { steps: { orderBy: { stepOrder: 'asc' } } } }),
      this.prisma.workflowDefinition.findFirst({ where: { code, version: toVersion }, include: { steps: { orderBy: { stepOrder: 'asc' } } } }),
    ]);
    if (!from || !to) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: `Version not found for ${code}` });

    // Nama pembuat diambil sekali untuk kedua versi — ringkasan harus lengkap.
    const creatorIds = [...new Set([from.createdBy, to.createdBy])];
    const users = await this.prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, displayName: true } });
    const nameById = new Map(users.map((u) => [u.id, u.displayName]));

    const summary = (d: typeof from) => ({
      id: d.id, code: d.code, version: d.version, status: d.status, name: d.name,
      stepCount: d.steps.length, createdByName: nameById.get(d.createdBy) ?? null,
      createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString(),
      isActive: d.status === 'ACTIVE',
    });

    // Pasangkan menurut `stepOrder` — urutan itulah identitas langkah di dalam versi.
    const fromByOrder = new Map(from.steps.map((s) => [s.stepOrder, s]));
    const toByOrder = new Map(to.steps.map((s) => [s.stepOrder, s]));

    const added = to.steps
      .filter((s) => !fromByOrder.has(s.stepOrder))
      .map((s) => ({ stepOrder: s.stepOrder, name: s.name, approverRoleCode: s.approverRoleCode }));
    const removed = from.steps
      .filter((s) => !toByOrder.has(s.stepOrder))
      .map((s) => ({ stepOrder: s.stepOrder, name: s.name, approverRoleCode: s.approverRoleCode }));

    const text = (value: unknown) => (value === null || value === undefined ? null : String(value));
    const changed: Array<{ stepOrder: number; fields: Array<{ field: string; from: string | null; to: string | null }> }> = [];
    for (const [order, before] of fromByOrder) {
      const after = toByOrder.get(order);
      if (!after) continue;
      const fields = [
        { field: 'name', from: before.name, to: after.name },
        { field: 'approverRoleCode', from: before.approverRoleCode, to: after.approverRoleCode },
        { field: 'conditionField', from: text(before.conditionField), to: text(after.conditionField) },
        { field: 'conditionOp', from: text(before.conditionOp), to: text(after.conditionOp) },
        { field: 'conditionValue', from: text(toNumber(before.conditionValue)), to: text(toNumber(after.conditionValue)) },
      ].filter((f) => f.from !== f.to);
      if (fields.length > 0) changed.push({ stepOrder: order, fields });
    }

    return { from: summary(from), to: summary(to), added, removed, changed };
  }
}
