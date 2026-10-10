import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation/application/services/audit.service';
import type { CreateDoaRuleDto, ResolveDoaDto } from '../../presentation/dto/foundation-hardening.dto';

/** Satu aturan sebagai interval nominal. `to` = Infinity bila tak dibatasi. */
interface Interval {
  id: string;
  from: number;
  to: number;
}

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

  /**
   * Peta wewenang sebuah jenis transaksi: aturan mana yang saling menimpa dan
   * nominal mana yang tidak ditutup aturan mana pun. Batas atas `null` = tak
   * terbatas (∞). Dua rentang yang hanya bersinggungan di satu titik (mis.
   * 0–100 dan 100–200) **tidak** dianggap menimpa.
   */
  async analyzeRules(transactionType: string) {
    const rows = await this.prisma.doaRule.findMany({
      where: { transactionType, status: 'ACTIVE' },
      select: { id: true, amountFrom: true, amountTo: true },
    });
    const intervals: Interval[] = rows
      .map((r) => ({
        id: r.id,
        from: r.amountFrom == null ? 0 : Number(r.amountFrom),
        to: r.amountTo == null ? Number.POSITIVE_INFINITY : Number(r.amountTo),
      }))
      .sort((a, b) => a.from - b.from);

    const overlaps: Array<{ aId: string; bId: string; from: number; to: number | null }> = [];
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const a = intervals[i]!;
        const b = intervals[j]!;
        const lo = Math.max(a.from, b.from);
        const hi = Math.min(a.to, b.to);
        if (lo < hi) overlaps.push({ aId: a.id, bId: b.id, from: lo, to: Number.isFinite(hi) ? hi : null });
      }
    }

    const gaps: Array<{ from: number; to: number | null }> = [];
    let cursor = 0;
    for (const rule of intervals) {
      if (rule.from > cursor) gaps.push({ from: cursor, to: rule.from });
      if (rule.to > cursor) cursor = rule.to;
      if (!Number.isFinite(cursor)) break;
    }

    return { transactionType, overlaps, gaps, generatedAt: new Date().toISOString() };
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
