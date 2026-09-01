import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateControlAccountDto, ListControlAccountQueryDto } from '../../presentation/dto/project-controls.dto';

@Injectable()
export class ControlAccountService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-PRJ-004: Control Account
  async createControlAccount(projectId: string, dto: CreateControlAccountDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
    if (!wbs || wbs.projectId !== projectId) throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS tidak ditemukan di project ini' });

    const exists = await this.prisma.controlAccount.findUnique({ where: { projectId_code: { projectId, code: dto.code } } });
    if (exists) throw new ConflictException({ code: 'CONTROL_ACCOUNT_EXISTS', message: 'Kode control account sudah digunakan' });

    const ca = await this.prisma.controlAccount.create({
      data: {
        projectId, wbsItemId: dto.wbsItemId, code: dto.code, name: dto.name,
        responsibleManager: dto.responsibleManager, budgetAmount: dto.budgetAmount ?? 0, plannedValue: dto.plannedValue ?? 0,
        scheduleStart: dto.scheduleStart ? new Date(dto.scheduleStart) : null,
        scheduleEnd: dto.scheduleEnd ? new Date(dto.scheduleEnd) : null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'ControlAccount.CREATE', resource: 'ControlAccount', resourceId: ca.id, newValue: { projectId, code: dto.code, name: dto.name, wbs: wbs.code }, source: 'api' });
    return ca;
  }

  async listControlAccounts(projectId: string, query: ListControlAccountQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.ControlAccountWhereInput = { projectId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.controlAccount.findMany({ where, include: { wbsItem: { select: { code: true, name: true } } }, orderBy: { code: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.controlAccount.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
