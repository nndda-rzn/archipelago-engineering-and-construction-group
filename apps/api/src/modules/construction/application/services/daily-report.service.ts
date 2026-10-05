import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateDailyReportDto, ListDailyReportQueryDto } from '../../presentation/dto/construction.dto';

@Injectable()
export class DailyReportService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async findAll(projectId: string, query: ListDailyReportQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ConstructionDailyReportWhereInput = { projectId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.constructionDailyReport.findMany({
        where,
        include: { manpowerLines: true },
        orderBy: { reportDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.constructionDailyReport.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async create(projectId: string, dto: CreateDailyReportDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const manpowerLines = dto.manpowerLines ?? [];
    const manpowerTotal = manpowerLines.reduce((sum, l) => sum + l.manpowerCount, 0);

    const report = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'DR' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'DR', prefix: `DR-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.constructionDailyReport.create({
        data: {
          drNumber: seq,
          projectId,
          reportDate: dto.reportDate ? new Date(dto.reportDate) : new Date(),
          weather: dto.weather ?? null,
          temperatureC: dto.temperatureC ?? null,
          summary: dto.summary,
          issues: dto.issues ?? null,
          hseNote: dto.hseNote ?? null,
          qualityNote: dto.qualityNote ?? null,
          manpowerTotal,
          equipmentList: dto.equipmentList ?? null,
          materialList: dto.materialList ?? null,
          reportedBy: actorId,
          manpowerLines: {
            create: manpowerLines.map((l) => ({
              trade: l.trade,
              manpowerCount: l.manpowerCount,
              hoursWorked: l.hoursWorked,
              note: l.note ?? null,
            })),
          },
        },
        include: { manpowerLines: true },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'DailyReport.CREATE',
      resource: 'ConstructionDailyReport',
      resourceId: report.id,
      newValue: { drNumber: report.drNumber, projectId, manpowerTotal },
      source: 'api',
    });

    return report;
  }
}
