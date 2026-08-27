import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation/application/services/audit.service';
import type {
  CreateCurrencyDto, CreateDoaRuleDto, CreateExchangeRateDto, CreateOrganizationDto, ResolveDoaDto,
} from '../../presentation/dto/foundation-hardening.dto';

@Injectable()
export class FoundationHardeningService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ─── FR-FND-002: Effective-dated organization ───────────────────────────────

  async createOrganization(dto: CreateOrganizationDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    if (dto.parentId) {
      const parent = await this.prisma.organization.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException({ code: 'PARENT_NOT_FOUND', message: 'Parent organization tidak ditemukan' });
    }

    const org = await this.prisma.organization.create({
      data: {
        legalEntityId: dto.legalEntityId,
        name: dto.name,
        orgType: dto.orgType,
        parentId: dto.parentId ?? null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'Organization.CREATE', resource: 'Organization', resourceId: org.id, newValue: { name: dto.name, orgType: dto.orgType }, source: 'api' });
    return org;
  }

  // As-of date: tampilkan struktur aktif pada tanggal tertentu (effectiveFrom <= asOf < effectiveTo)
  async listOrganizations(legalEntityId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const orgs = await this.prisma.organization.findMany({
      where: {
        legalEntityId,
        effectiveFrom: { lte: asOfDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
      },
      orderBy: { name: 'asc' },
    });

    const byId = new Map(orgs.map((o) => [o.id, { ...o, children: [] as typeof orgs }]));
    const roots: Array<typeof orgs[number] & { children: typeof orgs }> = [];
    for (const org of orgs) {
      const node = byId.get(org.id)!;
      if (org.parentId && byId.has(org.parentId)) {
        byId.get(org.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return { legalEntityId, asOf: asOfDate.toISOString(), total: orgs.length, roots };
  }

  // ─── FR-FND-006: DoA resolution ─────────────────────────────────────────────

  async createDoaRule(dto: CreateDoaRuleDto, actorId: string) {
    const rule = await this.prisma.doaRule.create({
      data: {
        transactionType: dto.transactionType,
        legalEntityId: dto.legalEntityId ?? null,
        businessUnit: dto.businessUnit ?? null,
        projectId: dto.projectId ?? null,
        currencyCode: dto.currencyCode ?? null,
        amountFrom: dto.amountFrom ?? null,
        amountTo: dto.amountTo ?? null,
        riskLevel: dto.riskLevel ?? null,
        approverLevel: dto.approverLevel,
        approverRoleCode: dto.approverRoleCode ?? null,
        approvalMode: dto.approvalMode ?? 'SEQUENTIAL',
        priority: dto.priority ?? 0,
      },
    });

    await this.audit.record({ userId: actorId, action: 'DoaRule.CREATE', resource: 'DoaRule', resourceId: rule.id, newValue: { transactionType: dto.transactionType, approverLevel: dto.approverLevel }, source: 'api' });
    return rule;
  }

  async listDoaRules() {
    const items = await this.prisma.doaRule.findMany({
      orderBy: [{ transactionType: 'asc' }, { priority: 'desc' }],
    });
    return { items, total: items.length };
  }

  // FR-FND-006: resolve approver — rule ter-spesifik menang (prioritas)
  async resolveDoa(dto: ResolveDoaDto) {
    const rules = await this.prisma.doaRule.findMany({
      where: {
        transactionType: dto.transactionType,
        status: 'ACTIVE',
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      include: { legalEntity: { select: { code: true } }, project: { select: { code: true } } },
    });

    const amount = dto.amount ?? 0;
    const matched = rules
      .filter((r) => {
        if (r.legalEntityId && r.legalEntityId !== dto.legalEntityId) return false;
        if (r.businessUnit && r.businessUnit !== dto.businessUnit) return false;
        if (r.projectId && r.projectId !== dto.projectId) return false;
        if (r.currencyCode && r.currencyCode !== dto.currencyCode) return false;
        if (r.riskLevel && r.riskLevel !== dto.riskLevel) return false;
        if (r.amountFrom != null && amount < Number(r.amountFrom)) return false;
        if (r.amountTo != null && amount > Number(r.amountTo)) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority);

    const resolved = matched[0] ?? null;
    return {
      transactionType: dto.transactionType,
      amount,
      matchedRules: matched.length,
      resolved: resolved
        ? {
            ruleId: resolved.id,
            approverLevel: resolved.approverLevel,
            approverRoleCode: resolved.approverRoleCode,
            approvalMode: resolved.approvalMode,
            priority: resolved.priority,
          }
        : null,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── FR-FND-011: Currency + exchange rate ───────────────────────────────────

  async createCurrency(dto: CreateCurrencyDto, actorId: string) {
    const exists = await this.prisma.currency.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException({ code: 'CURRENCY_EXISTS', message: 'Mata uang sudah ada' });

    const currency = await this.prisma.currency.create({
      data: {
        code: dto.code,
        name: dto.name,
        symbol: dto.symbol ?? '',
        decimals: dto.decimals ?? 2,
      },
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
      throw new ConflictException({ code: 'SAME_CURRENCY', message: 'Mata uang asal dan tujuan harus berbeda' });
    }
    const from = await this.prisma.currency.findUnique({ where: { id: dto.fromCurrencyId } });
    const to = await this.prisma.currency.findUnique({ where: { id: dto.toCurrencyId } });
    if (!from || !to) throw new NotFoundException({ code: 'CURRENCY_NOT_FOUND', message: 'Mata uang tidak ditemukan' });

    const rate = await this.prisma.exchangeRate.create({
      data: {
        fromCurrencyId: dto.fromCurrencyId,
        toCurrencyId: dto.toCurrencyId,
        rateType: dto.rateType,
        rate: dto.rate,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
      },
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

  // Revaluation: konversi amount pakai rate historis terdekat pada tanggal
  async revalue(amount: number, fromCurrencyCode: string, toCurrencyCode: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const from = await this.prisma.currency.findUnique({ where: { code: fromCurrencyCode } });
    const to = await this.prisma.currency.findUnique({ where: { code: toCurrencyCode } });
    if (!from || !to) throw new NotFoundException({ code: 'CURRENCY_NOT_FOUND', message: 'Mata uang tidak ditemukan' });

    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyId: from.id,
        toCurrencyId: to.id,
        effectiveDate: { lte: asOfDate },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!rate) {
      return { from: fromCurrencyCode, to: toCurrencyCode, amount, converted: null, rate: null, note: 'Rate tidak ditemukan', asOf: asOfDate.toISOString() };
    }

    const converted = amount * Number(rate.rate);
    return {
      from: fromCurrencyCode,
      to: toCurrencyCode,
      amount,
      rate: Number(rate.rate),
      rateType: rate.rateType,
      converted: Math.round(converted * 100) / 100,
      asOf: asOfDate.toISOString(),
    };
  }
}
