import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { WorkflowQueryService } from './shared/workflow-query.service';
import { WorkflowStepService } from './workflow-step.service';
import { WorkflowLifecycleService } from './workflow-lifecycle.service';
import { toNumber } from './shared/condition-group-mapper';
import type {
  AddWorkflowStepDto,
  CreateWorkflowDefinitionDto,
  DuplicateWorkflowDto,
  PublishWorkflowDto,
  ReorderWorkflowStepsDto,
  UpdateWorkflowDefinitionDto,
  UpdateWorkflowStepDto,
} from '../../presentation/dto/approval.dto';

/**
 * Permukaan publik definisi workflow untuk controller. Ini **facade**: penulisan
 * langkah didelegasikan ke `WorkflowStepService`, siklus hidup (publish/archive/
 * duplikasi/versi) ke `WorkflowLifecycleService`, dan read-model ke
 * `WorkflowQueryService`. Controller tidak berubah.
 */
@Injectable()
export class WorkflowDefinitionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(WorkflowQueryService) private readonly workflow: WorkflowQueryService,
    @Inject(WorkflowStepService) private readonly steps: WorkflowStepService,
    @Inject(WorkflowLifecycleService) private readonly lifecycle: WorkflowLifecycleService,
  ) {}

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
    return this.workflow.listWithMeta();
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

  /** Semua versi satu `code`, terbaru lebih dulu, lengkap dengan status aktif. */
  async listVersions(code: string) {
    const definitions = await this.workflow.listWithMeta({ code });
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

  // ── Delegasi ke WorkflowStepService ─────────────────────────────────────────
  addStep(id: string, dto: AddWorkflowStepDto, actorId: string) {
    return this.steps.addStep(id, dto, actorId);
  }

  updateStep(definitionId: string, stepId: string, dto: UpdateWorkflowStepDto, actorId: string) {
    return this.steps.updateStep(definitionId, stepId, dto, actorId);
  }

  removeStep(definitionId: string, stepId: string, actorId: string) {
    return this.steps.removeStep(definitionId, stepId, actorId);
  }

  reorderSteps(id: string, dto: ReorderWorkflowStepsDto, actorId: string) {
    return this.steps.reorderSteps(id, dto, actorId);
  }

  // ── Delegasi ke WorkflowLifecycleService ────────────────────────────────────
  publishWorkflow(id: string, dto: PublishWorkflowDto, actorId: string) {
    return this.lifecycle.publishWorkflow(id, dto, actorId);
  }

  archiveWorkflow(id: string, actorId: string) {
    return this.lifecycle.archiveWorkflow(id, actorId);
  }

  deleteWorkflow(id: string, actorId: string) {
    return this.lifecycle.deleteWorkflow(id, actorId);
  }

  duplicateDefinition(id: string, dto: DuplicateWorkflowDto, actorId: string) {
    return this.lifecycle.duplicateDefinition(id, dto, actorId);
  }

  createNewVersion(code: string, actorId: string) {
    return this.lifecycle.createNewVersion(code, actorId);
  }
}
