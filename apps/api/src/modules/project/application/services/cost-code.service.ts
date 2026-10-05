import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateCostCodeDto, ListCostCodeQueryDto } from '../../presentation/dto/project-controls.dto';

@Injectable()
export class CostCodeService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createCostCode(projectId: string, dto: CreateCostCodeDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    if (dto.wbsItemId) {
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
      if (!wbs || wbs.projectId !== projectId) throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS not found in this project' });
    }

    const exists = await this.prisma.costCode.findUnique({ where: { projectId_code: { projectId, code: dto.code } } });
    if (exists) throw new ConflictException({ code: 'COST_CODE_EXISTS', message: 'Cost code already in use' });

    const costCode = await this.prisma.costCode.create({
      data: { projectId, wbsItemId: dto.wbsItemId ?? null, code: dto.code, name: dto.name, costType: dto.costType ?? 'DIRECT' },
    });

    await this.audit.record({ userId: actorId, action: 'CostCode.CREATE', resource: 'CostCode', resourceId: costCode.id, newValue: { projectId, code: dto.code, name: dto.name }, source: 'api' });
    return costCode;
  }

  async listCostCodes(projectId: string, query: ListCostCodeQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.CostCodeWhereInput = { projectId, ...(query.status ? { status: query.status } : {}), ...(query.costType ? { costType: query.costType } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.costCode.findMany({ where, include: { wbsItem: { select: { code: true, name: true } } }, orderBy: { code: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.costCode.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
