import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { RoleAssignmentLookup } from './shared/role-assignment.lookup';
import { WorkflowQueryService } from './shared/workflow-query.service';
import type {
  DuplicateWorkflowDto,
  PublishWorkflowDto,
} from '../../presentation/dto/approval.dto';

/**
 * Siklus hidup definisi workflow: publish, archive, hapus, duplikasi, dan
 * pembuatan versi baru. Dipisah dari penulisan langkah (`WorkflowStepService`)
 * dan dari read-model definisi.
 *
 * Publish memvalidasi SELURUH langkah lebih dulu dan melaporkan semua masalah
 * sekaligus (`WORKFLOW_NOT_READY`), bukan berhenti di masalah pertama — supaya
 * penulis definisi memperbaiki semuanya dalam satu putaran.
 */
@Injectable()
export class WorkflowLifecycleService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(RoleAssignmentLookup) private readonly roles: RoleAssignmentLookup,
    @Inject(WorkflowQueryService) private readonly workflow: WorkflowQueryService,
  ) {}

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
      const role = await this.roles.findRole(step.approverRoleCode);
      if (!role) {
        problems.push(`Step ${step.stepOrder}: role ${step.approverRoleCode} does not exist`);
        continue;
      }
      const holder = await this.roles.findActiveAssignment(role.id);
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

  /**
   * Duplikasi definisi menjadi definisi **baru** (kode baru) berstatus DRAFT,
   * menyalin seluruh langkahnya. Berguna untuk membuat varian (mis. alur berbeda
   * per unit bisnis) tanpa menyusun ulang rantai dari nol.
   *
   * Versi selalu mulai dari 1 karena ini definisi baru, bukan lanjutan riwayat.
   */
  async duplicateDefinition(id: string, dto: DuplicateWorkflowDto, actorId: string) {
    const source = await this.prisma.workflowDefinition.findUnique({
      where: { id }, include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!source) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });

    const existing = await this.prisma.workflowDefinition.findFirst({ where: { code: dto.code } });
    if (existing) throw new ConflictException({ code: 'WORKFLOW_EXISTS', message: `Workflow ${dto.code} already exists` });

    const created = await this.prisma.$transaction(async (tx) => tx.workflowDefinition.create({
      data: {
        code: dto.code,
        name: dto.name ?? `${source.name} (copy)`,
        description: source.description,
        version: 1,
        status: 'DRAFT',
        transactionType: source.transactionType,
        createdBy: actorId,
        steps: {
          create: source.steps.map((s) => ({
            stepOrder: s.stepOrder,
            name: s.name,
            approverRoleCode: s.approverRoleCode,
            conditionField: s.conditionField,
            conditionOp: s.conditionOp,
            conditionValue: s.conditionValue,
            conditionGroup: s.conditionGroup ?? undefined,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    }));

    await this.audit.record({
      userId: actorId, action: 'Workflow.DUPLICATE', resource: 'Workflow', resourceId: created.id,
      newValue: { from: source.code, fromVersion: source.version, to: dto.code, version: 1 }, source: 'api',
    });

    return created;
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
          steps: { create: latest.steps.sort((a, b) => a.stepOrder - b.stepOrder).map((s) => ({ stepOrder: s.stepOrder, name: s.name, approverRoleCode: s.approverRoleCode, conditionField: s.conditionField, conditionOp: s.conditionOp, conditionValue: s.conditionValue, conditionGroup: s.conditionGroup ?? undefined })) },
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
