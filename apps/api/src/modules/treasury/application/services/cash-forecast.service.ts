import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateCashForecastDto } from '../../presentation/dto/treasury.dto';

@Injectable()
export class CashForecastService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createCashForecast(dto: CreateCashForecastDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const receipt = dto.expectedReceipt ?? 0;
    const ap = dto.expectedAp ?? 0;
    const payroll = dto.expectedPayroll ?? 0;
    const loan = dto.expectedLoan ?? 0;
    const tax = dto.expectedTax ?? 0;
    const projectCf = dto.projectCashFlow ?? 0;
    const net = receipt + loan - ap - payroll - tax + projectCf;

    const forecastCode = await this.seq.next('CF', `CF-${new Date().getFullYear()}-`);

    const forecast = await this.prisma.cashForecast.create({
      data: {
        forecastCode,
        legalEntityId: dto.legalEntityId,
        period: dto.period,
        expectedReceipt: receipt,
        expectedAp: ap,
        expectedPayroll: payroll,
        expectedLoan: loan,
        expectedTax: tax,
        projectCashFlow: projectCf,
        netForecast: Math.round(net * 100) / 100,
      },
    });

    await this.audit.record({ userId: actorId, action: 'CashForecast.CREATE', resource: 'CashForecast', resourceId: forecast.id, newValue: { forecastCode, period: dto.period, net: Math.round(net * 100) / 100 }, source: 'api' });
    return forecast;
  }

  async listCashForecasts() {
    const items = await this.prisma.cashForecast.findMany({
      include: { legalEntity: { select: { code: true } } },
      orderBy: { period: 'desc' },
    });
    return { items, total: items.length };
  }
}
