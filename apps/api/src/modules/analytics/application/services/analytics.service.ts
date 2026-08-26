import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

/**
 * Fase 10 Analytics — advisory read-only (PRD §32: AI/analytics = advisory, bukan transaction authority).
 * Executive dashboard aggregat lintas domain + rule-based anomaly detection.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  // Executive KPIs lintas domain
  async executive() {
    const [projects, budgetAgg, vendorInvoiceAgg, paymentAgg, collectionAgg, clientInvoiceAgg] = await this.prisma.$transaction([
      this.prisma.project.findMany({ select: { id: true, code: true, name: true, status: true, contractValue: true, advanceAmount: true } }),
      this.prisma.budgetItem.aggregate({ _sum: { amount: true } }),
      this.prisma.vendorInvoice.aggregate({ where: { status: 'POSTED' }, _sum: { totalAmount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
      this.prisma.collection.aggregate({ where: { status: 'POSTED' }, _sum: { totalAmount: true } }),
      this.prisma.clientInvoice.aggregate({ where: { status: 'POSTED' }, _sum: { totalAmount: true } }),
    ]);

    // status count terpisah agar typing bersih (groupBy _count di dalam $transaction array ambigu)
    const statusGroups = await this.prisma.project.groupBy({ by: ['status'], _count: { _all: true } });
    const projectStatusCount = Object.fromEntries(statusGroups.map((r) => [r.status, r._count._all]));
    const totalContractValue = projects.reduce((s, p) => s + (p.contractValue != null ? Number(p.contractValue) : 0), 0);

    const [openClaims, openNcrs, openIncidents, overduePm, openPunch] = await this.prisma.$transaction([
      this.prisma.progressClaim.count({ where: { status: 'DRAFT' } }),
      this.prisma.ncr.count({ where: { status: { not: 'CLOSED' } } }),
      this.prisma.hseIncident.count({ where: { status: { not: 'RESOLVED' } } }),
      this.prisma.equipmentPm.count({ where: { status: 'SCHEDULED', dueDate: { lt: new Date() } } }),
      this.prisma.punchListItem.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      projects: {
        total: projects.length,
        byStatus: projectStatusCount,
        totalContractValue,
        totalAdvance: projects.reduce((s, p) => s + (p.advanceAmount != null ? Number(p.advanceAmount) : 0), 0),
      },
      finance: {
        totalBudget: Number(budgetAgg._sum.amount ?? 0),
        postedVendorInvoice: Number(vendorInvoiceAgg._sum.totalAmount ?? 0),
        postedClientInvoice: Number(clientInvoiceAgg._sum.totalAmount ?? 0),
        cashIn: Number(collectionAgg._sum?.totalAmount ?? 0),
        cashOut: Number(paymentAgg._sum?.totalAmount ?? 0),
      },
      operational: {
        openClaims: openClaims,
        openNcrs: openNcrs,
        openIncidents: openIncidents,
        overduePm: overduePm,
        openPunchItems: openPunch,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // Rule-based anomaly detection
  async anomalies() {
    const anomalies: Array<{ type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; projectCode?: string; message: string }> = [];

    // 1. Budget overrun: budget item usage mendekati/melebihi amount (via journal lines per project vs budget)
    const budgetAgg = await this.prisma.budgetItem.groupBy({ by: ['projectId'], _sum: { amount: true } });
    const budgetByProject = new Map(budgetAgg.map((r) => [r.projectId, Number(r._sum.amount ?? 0)]));
    const projects = await this.prisma.project.findMany({ select: { id: true, code: true, contractValue: true } });
    for (const p of projects) {
      const budget = budgetByProject.get(p.id) ?? 0;
      const contract = p.contractValue != null ? Number(p.contractValue) : 0;
      if (budget > 0 && contract > 0 && budget / contract > 0.9) {
        anomalies.push({
          type: 'BUDGET_OVERRUN',
          severity: budget / contract > 1 ? 'HIGH' : 'MEDIUM',
          projectCode: p.code,
          message: `Budget ${Math.round((budget / contract) * 100)}% dari kontrak (${budget.toLocaleString('id-ID')} / ${contract.toLocaleString('id-ID')})`,
        });
      }
    }

    // 2. PM overdue
    const overduePmCount = await this.prisma.equipmentPm.count({ where: { status: 'SCHEDULED', dueDate: { lt: new Date() } } });
    if (overduePmCount > 0) {
      anomalies.push({ type: 'PM_OVERDUE', severity: 'MEDIUM', message: `${overduePmCount} PM schedule melewati jatuh tempo` });
    }

    // 3. NCR critical belum ditutup
    const criticalNcrCount = await this.prisma.ncr.count({ where: { severity: 'CRITICAL', status: { not: 'CLOSED' } } });
    if (criticalNcrCount > 0) {
      anomalies.push({ type: 'NCR_CRITICAL_OPEN', severity: 'HIGH', message: `${criticalNcrCount} NCR CRITICAL belum ditutup` });
    }

    // 4. Insiden HIGH/CRITICAL belum resolved
    const openHighIncidents = await this.prisma.hseIncident.count({ where: { severity: { in: ['HIGH', 'CRITICAL'] }, status: { not: 'RESOLVED' } } });
    if (openHighIncidents > 0) {
      anomalies.push({ type: 'INCIDENT_HIGH_OPEN', severity: 'HIGH', message: `${openHighIncidents} insiden HIGH/CRITICAL belum resolved` });
    }

    // 5. Alokasi karyawan >100%
    const overallocated = await this.prisma.projectAssignment.groupBy({
      by: ['employeeId'],
      where: { status: 'ACTIVE' },
      _sum: { allocationPercent: true },
      having: { allocationPercent: { _sum: { gt: 100 } } },
    });
    if (overallocated.length > 0) {
      const employeeIds = overallocated.map((r) => r.employeeId);
      const emps = await this.prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { name: true } });
      anomalies.push({ type: 'ALLOCATION_OVER_100', severity: 'MEDIUM', message: `${emps.length} karyawan alokasi aktif >100%: ${emps.map((e) => e.name).join(', ')}` });
    }

    // 6. Claim DRAFT menumpuk
    const draftClaims = await this.prisma.progressClaim.count({ where: { status: 'DRAFT' } });
    if (draftClaims >= 3) {
      anomalies.push({ type: 'CLAIMS_DRAFT_BACKLOG', severity: 'LOW', message: `${draftClaims} claim masih DRAFT — perlu sertifikasi` });
    }

    return { anomalies, total: anomalies.length, generatedAt: new Date().toISOString() };
  }

  // ─── Advanced Reporting (Fase 10) ───

  // Cash flow: cash in (collection) vs cash out (payment) per bulan
  async cashFlow() {
    const [collections, payments] = await this.prisma.$transaction([
      this.prisma.collection.findMany({ where: { status: 'POSTED' }, select: { totalAmount: true, collectedAt: true } }),
      this.prisma.payment.findMany({ where: { status: 'PAID' }, select: { totalAmount: true, paymentDate: true } }),
    ]);

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const byMonth = new Map<string, { cashIn: number; cashOut: number }>();
    for (const c of collections) {
      const k = monthKey(new Date(c.collectedAt));
      const cur = byMonth.get(k) ?? { cashIn: 0, cashOut: 0 };
      cur.cashIn += Number(c.totalAmount);
      byMonth.set(k, cur);
    }
    for (const p of payments) {
      const k = monthKey(new Date(p.paymentDate));
      const cur = byMonth.get(k) ?? { cashIn: 0, cashOut: 0 };
      cur.cashOut += Number(p.totalAmount);
      byMonth.set(k, cur);
    }

    const series = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v, net: Math.round((v.cashIn - v.cashOut) * 100) / 100 }));
    const totalIn = series.reduce((s, r) => s + r.cashIn, 0);
    const totalOut = series.reduce((s, r) => s + r.cashOut, 0);

    return { series, totalCashIn: totalIn, totalCashOut: totalOut, netCash: Math.round((totalIn - totalOut) * 100) / 100, generatedAt: new Date().toISOString() };
  }

  // Aging AP/AR (FR-FIN-007): invoice belum dibayar dikelompokkan umur
  async aging() {
    const today = new Date();
    const bucket = (d: Date): string => {
      const days = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (days <= 0) return 'CURRENT';
      if (days <= 30) return '1-30';
      if (days <= 60) return '31-60';
      if (days <= 90) return '61-90';
      return '90+';
    };

    // AR: client invoice POSTED belum lunas
    const clientInvoices = await this.prisma.clientInvoice.findMany({
      where: { status: 'POSTED' },
      include: { collections: { select: { amount: true } } },
    });
    const arBuckets = new Map<string, number>();
    for (const inv of clientInvoices) {
      const paid = inv.collections.reduce((s, c) => s + Number(c.amount), 0);
      const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
      if (remaining > 0) {
        const b = bucket(new Date(inv.invoiceDate));
        arBuckets.set(b, (arBuckets.get(b) ?? 0) + remaining);
      }
    }

    // AP: vendor invoice POSTED belum dibayar
    const vendorInvoices = await this.prisma.vendorInvoice.findMany({
      where: { status: 'POSTED' },
      include: { payments: { select: { amount: true } } },
    });
    const apBuckets = new Map<string, number>();
    for (const inv of vendorInvoices) {
      const paid = (inv.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
      if (remaining > 0) {
        const b = bucket(new Date(inv.createdAt));
        apBuckets.set(b, (apBuckets.get(b) ?? 0) + remaining);
      }
    }

    const order = ['CURRENT', '1-30', '31-60', '61-90', '90+'];
    return {
      ar: order.map((b) => ({ bucket: b, amount: Math.round((arBuckets.get(b) ?? 0) * 100) / 100 })),
      ap: order.map((b) => ({ bucket: b, amount: Math.round((apBuckets.get(b) ?? 0) * 100) / 100 })),
      generatedAt: new Date().toISOString(),
    };
  }

  // Project cost summary: budget vs cost vs claim per project
  async projectCostSummary() {
    const projects = await this.prisma.project.findMany({ select: { id: true, code: true, name: true, contractValue: true } });
    const [budgetAgg, vendorInvoiceAgg, clientInvoiceAgg] = await Promise.all([
      this.prisma.budgetItem.groupBy({ by: ['projectId'], _sum: { amount: true } }),
      this.prisma.vendorInvoice.groupBy({ by: ['projectId'], where: { status: 'POSTED' }, _sum: { totalAmount: true } }),
      this.prisma.clientInvoice.groupBy({ by: ['projectId'], where: { status: 'POSTED' }, _sum: { totalAmount: true } }),
    ]);
    const budgetMap = new Map(budgetAgg.map((r) => [r.projectId, Number(r._sum?.amount ?? 0)]));
    const costMap = new Map(vendorInvoiceAgg.map((r) => [r.projectId, Number(r._sum?.totalAmount ?? 0)]));
    const revenueMap = new Map(clientInvoiceAgg.map((r) => [r.projectId, Number(r._sum?.totalAmount ?? 0)]));

    const items = projects.map((p) => {
      const budget = budgetMap.get(p.id) ?? 0;
      const cost = costMap.get(p.id) ?? 0;
      const revenue = revenueMap.get(p.id) ?? 0;
      const contract = p.contractValue != null ? Number(p.contractValue) : 0;
      return {
        projectCode: p.code,
        projectName: p.name,
        contractValue: Math.round(contract * 100) / 100,
        budget: Math.round(budget * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        margin: Math.round((revenue - cost) * 100) / 100,
        budgetUsagePct: budget > 0 ? Math.round((cost / budget) * 1000) / 10 : 0,
      };
    });

    return { items, generatedAt: new Date().toISOString() };
  }
}
