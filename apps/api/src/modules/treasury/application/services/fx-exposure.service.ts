import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateFxExposureDto } from '../../presentation/dto/treasury.dto';

@Injectable()
export class FxExposureService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-TRY-005: FX Exposure
  async createFxExposure(dto: CreateFxExposureDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const existing = await this.prisma.fxExposure.findUnique({
      where: { legalEntityId_currency: { legalEntityId: dto.legalEntityId, currency: dto.currency } },
    });
    if (existing) throw new ConflictException({ code: 'FX_EXPOSURE_EXISTS', message: `Eksposur ${dto.currency} sudah ada — update via upsert` });

    const fx = await this.prisma.fxExposure.create({
      data: {
        legalEntityId: dto.legalEntityId,
        currency: dto.currency,
        exposureAmount: dto.exposureAmount,
        rate: dto.rate ?? 1,
        baseCurrency: dto.baseCurrency ?? 'IDR',
      },
    });

    await this.audit.record({ userId: actorId, action: 'FxExposure.CREATE', resource: 'FxExposure', resourceId: fx.id, newValue: { currency: dto.currency, exposureAmount: Number(dto.exposureAmount) }, source: 'api' });
    return fx;
  }

  async listFxExposures() {
    const items = await this.prisma.fxExposure.findMany({
      include: { legalEntity: { select: { code: true } } },
      orderBy: { currency: 'asc' },
    });
    return { items, total: items.length };
  }
}
