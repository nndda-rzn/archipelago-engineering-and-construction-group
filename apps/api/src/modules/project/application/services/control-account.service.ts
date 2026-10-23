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

  async createControlAccount(projectId: string, dto: CreateControlAccountDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
    if (!wbs || wbs.projectId !== projectId) throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS not found in this project' });

    const exists = await this.prisma.controlAccount.findUnique({ where: { projectId_code: { projectId, code: dto.code } } });
    if (exists) throw new ConflictException({ code: 'CONTROL_ACCOUNT_EXISTS', message: 'Control account code already in use' });

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
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.controlAccount.findMany({ where, include: { wbsItem: { select: { code: true, name: true } } }, orderBy: { code: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.controlAccount.count({ where }),
    ]);

    /**
     * `dataIssue` menandai control account yang sudah punya progres tapi belum
     * punya nilai rencana. Tanpa PV, SPI tidak bisa dihitung — dan AACE 60R-10
     * menyebut control account sebagai unit yang mengintegrasikan biaya dan
     * jadwal, jadi CA tanpa PV berarti integrasinya belum lengkap. Ini
     * dilaporkan sebagai masalah data, bukan ditampilkan sebagai nol.
     */
    const items = rows.map((ca) => ({
      ...ca,
      dataIssue: Number(ca.budgetAmount) === 0 && Number(ca.plannedValue) === 0 && Number(ca.progressPercent) > 0,
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
