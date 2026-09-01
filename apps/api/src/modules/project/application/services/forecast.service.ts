import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateForecastDto } from '../../presentation/dto/project-controls.dto';

@Injectable()
export class ForecastService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-PRJ-010: Forecast (ETC/EAC/VAC)
  async createForecast(projectId: string, dto: CreateForecastDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const budgetAgg = await this.prisma.budgetItem.aggregate({ where: { projectId, status: 'PUBLISHED' }, _sum: { amount: true } });
    const budget = Number(budgetAgg._sum?.amount ?? 0);

    const last = await this.prisma.forecast.findFirst({ where: { projectId }, orderBy: { version: 'desc' } });
    const nextVersion = (last?.version ?? 0) + 1;

    const eac = Number(dto.estimateAtCompletion);
    const etc = dto.estimateToComplete != null ? Number(dto.estimateToComplete) : Math.max(eac - budget, 0);
    const vac = Math.round((budget - eac) * 100) / 100;

    const forecast = await this.prisma.forecast.create({
      data: { projectId, version: nextVersion, period: dto.period, estimateAtCompletion: eac, estimateToComplete: Math.round(etc * 100) / 100, varianceAtCompletion: vac, note: dto.note ?? null, createdBy: actorId },
    });

    await this.audit.record({ userId: actorId, action: 'Forecast.CREATE', resource: 'Forecast', resourceId: forecast.id, newValue: { projectId, version: nextVersion, eac, etc, vac }, source: 'api' });
    return forecast;
  }

  async listForecasts(projectId: string) {
    const forecasts = await this.prisma.forecast.findMany({ where: { projectId }, orderBy: { version: 'desc' } });
    return { items: forecasts, total: forecasts.length };
  }
}
