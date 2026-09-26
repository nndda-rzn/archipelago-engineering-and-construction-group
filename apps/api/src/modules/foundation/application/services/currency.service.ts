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
