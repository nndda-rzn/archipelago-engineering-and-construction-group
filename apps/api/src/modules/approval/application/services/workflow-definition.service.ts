import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { AddWorkflowStepDto, CreateWorkflowDefinitionDto, PublishWorkflowDto } from '../../presentation/dto/approval.dto';

@Injectable()
export class WorkflowDefinitionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
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
    return this.prisma.workflowDefinition.findMany({
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
  }

  async addStep(id: string, dto: AddWorkflowStepDto, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });
    if (definition.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: 'Steps can only be added while in DRAFT' });
    }

    const existing = await this.prisma.workflowStep.findUnique({ where: { definitionId_stepOrder: { definitionId: id, stepOrder: dto.stepOrder } } });
    if (existing) throw new ConflictException({ code: 'STEP_EXISTS', message: `Step order ${dto.stepOrder} already exists` });

    const step = await this.prisma.workflowStep.create({
      data: { definitionId: id, stepOrder: dto.stepOrder, name: dto.name, approverRoleCode: dto.approverRoleCode, conditionField: dto.conditionField ?? null, conditionOp: dto.conditionOp ?? null, conditionValue: dto.conditionValue ?? null },
    });

    await this.audit.record({
      userId: actorId, action: 'Workflow.ADD_STEP', resource: 'Workflow', resourceId: id,
      newValue: { code: definition.code, stepOrder: dto.stepOrder, approverRoleCode: dto.approverRoleCode }, source: 'api',
    });

    return step;
  }

  async publishWorkflow(id: string, dto: PublishWorkflowDto, actorId: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id }, include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });
    if (definition.status !== 'DRAFT') throw new ConflictException({ code: 'NOT_DRAFT', message: 'Only DRAFT can be published' });
    if (definition.steps.length === 0) throw new ConflictException({ code: 'NO_STEPS', message: 'Workflow must have at least 1 step' });

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

  async createNewVersion(code: string, actorId: string) {
    const latest = await this.prisma.workflowDefinition.findFirst({
      where: { code }, include: { steps: true }, orderBy: { version: 'desc' },
    });
    if (!latest) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: `Workflow ${code} not found` });

    const newVersion = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workflowDefinition.create({
        data: {
          code, name: `${latest.name} v${latest.version + 1}`, description: latest.description, version: latest.version + 1,
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
}