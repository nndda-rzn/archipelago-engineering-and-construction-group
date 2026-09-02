import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation/application/services/audit.service';
import type { CreateDoaRuleDto, ResolveDoaDto } from '../../presentation/dto/foundation-hardening.dto';

@Injectable()
export class DoaService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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
    const items = await this.prisma.doaRule.findMany({ orderBy: [{ transactionType: 'asc' }, { priority: 'desc' }] });
    return { items, total: items.length };
  }

  async resolveDoa(dto: ResolveDoaDto) {
    const rules = await this.prisma.doaRule.findMany({
      where: { transactionType: dto.transactionType, status: 'ACTIVE', effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }] },
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
      transactionType: dto.transactionType, amount, matchedRules: matched.length,
      resolved: resolved ? { ruleId: resolved.id, approverLevel: resolved.approverLevel, approverRoleCode: resolved.approverRoleCode, approvalMode: resolved.approvalMode, priority: resolved.priority } : null,
      generatedAt: new Date().toISOString(),
    };
  }
}
