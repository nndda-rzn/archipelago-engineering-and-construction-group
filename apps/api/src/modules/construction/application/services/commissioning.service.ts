import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { buildTree } from '@/shared/utils/tree.util';
import type { CreateCommissioningDto } from '../../presentation/dto/commissioning.dto';

@Injectable()
export class CommissioningService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getTree(projectId: string) {
    const items = await this.prisma.commissioningSystem.findMany({
      where: { projectId },
      orderBy: [{ level: 'asc' }, { code: 'asc' }],
    });
    return buildTree(items);
  }

  async create(projectId: string, dto: CreateCommissioningDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    if (dto.parentId) {
      const parent = await this.prisma.commissioningSystem.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.projectId !== projectId) {
        throw new NotFoundException({ code: 'COMMISSIONING_PARENT_NOT_FOUND', message: 'Parent commissioning tidak ditemukan di project ini' });
      }
    }

    const existing = await this.prisma.commissioningSystem.findUnique({
      where: { projectId_code: { projectId, code: dto.code } },
    });
    if (existing) throw new ConflictException({ code: 'COMMISSIONING_EXISTS', message: 'Kode commissioning sudah ada di project ini' });

    const node = await this.prisma.commissioningSystem.create({
      data: {
        projectId,
        parentId: dto.parentId ?? null,
        code: dto.code,
        name: dto.name,
        level: dto.level,
        remark: dto.remark ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Commissioning.CREATE',
      resource: 'CommissioningSystem',
      resourceId: node.id,
      newValue: { projectId, code: node.code, level: node.level },
      source: 'api',
    });

    return node;
  }

  async updateStatus(id: string, status: string, actorId: string) {
    const node = await this.prisma.commissioningSystem.findUnique({ where: { id } });
    if (!node) throw new NotFoundException({ code: 'COMMISSIONING_NOT_FOUND', message: 'Commissioning tidak ditemukan' });

    const updated = await this.prisma.commissioningSystem.update({
      where: { id },
      data: { status },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Commissioning.STATUS',
      resource: 'CommissioningSystem',
      resourceId: id,
      oldValue: { status: node.status },
      newValue: { status },
      source: 'api',
    });

    return updated;
  }
}
