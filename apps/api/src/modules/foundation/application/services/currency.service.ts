import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation/application/services/audit.service';
import type { CreateCurrencyDto, CreateExchangeRateDto } from '../../presentation/dto/foundation-hardening.dto';

@Injectable()
export class CurrencyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createCurrency(dto: CreateCurrencyDto, actorId: string) {
    const exists = await this.prisma.currency.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException({ code: 'CURRENCY_EXISTS', message: 'Currency already exists' });

    const currency = await this.prisma.currency.create({
      data: { code: dto.code, name: dto.name, symbol: dto.symbol ?? '', decimals: dto.decimals ?? 2 },
    });
    await this.audit.record({ userId: actorId, action: 'Currency.CREATE', resource: 'Currency', resourceId: currency.id, newValue: { code: dto.code, name: dto.name }, source: 'api' });
    return currency;
  }

  async listCurrencies() {
    const items = await this.prisma.currency.findMany({ orderBy: { code: 'asc' } });
    return { items, total: items.length };
  }

  async createExchangeRate(dto: CreateExchangeRateDto, actorId: string) {
    if (dto.fromCurrencyId === dto.toCurrencyId) {
      throw new ConflictException({ code: 'SAME_CURRENCY', message: 'Source and target currency must be different' });
    }
    const from = await this.prisma.currency.findUnique({ where: { id: dto.fromCurrencyId } });
    const to = await this.prisma.currency.findUnique({ where: { id: dto.toCurrencyId } });
    if (!from || !to) throw new NotFoundException({ code: 'CURRENCY_NOT_FOUND', message: 'Currency not found' });

    const rate = await this.prisma.exchangeRate.create({
      data: { fromCurrencyId: dto.fromCurrencyId, toCurrencyId: dto.toCurrencyId, rateType: dto.rateType, rate: dto.rate, effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date() },
      include: { fromCurrency: { select: { code: true } }, toCurrency: { select: { code: true } } },
    });
    await this.audit.record({ userId: actorId, action: 'ExchangeRate.CREATE', resource: 'ExchangeRate', resourceId: rate.id, newValue: { from: from.code, to: to.code, rate: Number(dto.rate) }, source: 'api' });
    return rate;
  }

  async listExchangeRates() {
    const items = await this.prisma.exchangeRate.findMany({
      include: { fromCurrency: { select: { code: true } }, toCurrency: { select: { code: true } } },
      orderBy: { effectiveDate: 'desc' },
    });
    return { items, total: items.length };
  }

  /** Riwayat kurs satu pasangan (untuk sparkline tren) — urut naik. */
  async rateHistory(fromCurrencyId: string, toCurrencyId: string, rateType = 'SPOT') {
    const rows = await this.prisma.exchangeRate.findMany({
      where: { fromCurrencyId, toCurrencyId, rateType },
      orderBy: { effectiveDate: 'asc' },
      select: { effectiveDate: true, rate: true },
    });
    const points = rows
      .map((r) => ({ effectiveDate: r.effectiveDate.toISOString(), rate: Number(r.rate) }))
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    return { fromCurrencyId, toCurrencyId, rateType, points, generatedAt: new Date().toISOString() };
  }

  /** Aktif/nonaktif mata uang — compare-and-set, transisi no-op ditolak. */
  async setCurrencyStatus(id: string, status: 'ACTIVE' | 'INACTIVE', actorId: string) {
    const currency = await this.prisma.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException({ code: 'CURRENCY_NOT_FOUND', message: 'Currency not found' });
    const isActive = status === 'ACTIVE';
    const { count } = await this.prisma.currency.updateMany({ where: { id, isActive: { not: isActive } }, data: { isActive } });
    if (count === 0) throw new ConflictException({ code: 'INVALID_STATUS_TRANSITION', message: `Currency is already ${status}` });
    await this.audit.record({ userId: actorId, action: 'Currency.STATUS', resource: 'Currency', resourceId: id, oldValue: { isActive: currency.isActive }, newValue: { isActive }, source: 'api' });
    return this.prisma.currency.findUnique({ where: { id } });
  }

  async revalue(amount: number, fromCurrencyCode: string, toCurrencyCode: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const from = await this.prisma.currency.findUnique({ where: { code: fromCurrencyCode } });
    const to = await this.prisma.currency.findUnique({ where: { code: toCurrencyCode } });
    if (!from || !to) throw new NotFoundException({ code: 'CURRENCY_NOT_FOUND', message: 'Currency not found' });

    const rate = await this.prisma.exchangeRate.findFirst({
      where: { fromCurrencyId: from.id, toCurrencyId: to.id, effectiveDate: { lte: asOfDate } },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!rate) return { from: fromCurrencyCode, to: toCurrencyCode, amount, converted: null, rate: null, note: 'Exchange rate not found', asOf: asOfDate.toISOString() };

    const converted = amount * Number(rate.rate);
    return { from: fromCurrencyCode, to: toCurrencyCode, amount, rate: Number(rate.rate), rateType: rate.rateType, converted: Math.round(converted * 100) / 100, asOf: asOfDate.toISOString() };
  }
}
