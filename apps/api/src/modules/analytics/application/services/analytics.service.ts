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
}
