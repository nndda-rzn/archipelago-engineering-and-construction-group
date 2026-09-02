import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

/**
 * ActualCostCalculator — hitung actual cost project dari:
 *   1. Stock ledger OUT (material issues)
 *   2. Posted vendor invoices → GL journal debit akun beban 610x
 *
 * Menggantikan duplikasi identik di:
 *   - project-health.service.ts
 *   - project-controls.service.ts (earnedValue)
 *   - portfolio.service.ts
 */
@Injectable()
export class ActualCostCalculator {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async compute(projectId: string): Promise<number> {
    // 1. Material actual dari stock ledger OUT
    const ledgerOut = await this.prisma.stockLedgerEntry.aggregate({
      where: { projectId, movementType: 'OUT', totalValue: { not: null } },
      _sum: { totalValue: true },
    });
    const ledgerActual = Math.abs(Number(ledgerOut._sum?.totalValue ?? 0));

    // 2. Service/subcontract actual dari posted vendor invoices → GL journal beban 610x
    const postedInvoices = await this.prisma.vendorInvoice.findMany({
      where: { projectId, status: 'POSTED' },
      select: { id: true },
    });

    let invoiceActual = 0;
    if (postedInvoices.length > 0) {
      const journals = await this.prisma.journal.findMany({
        where: {
          source: 'INVOICE',
          status: 'POSTED',
          sourceId: { in: postedInvoices.map((i) => i.id) },
        },
        include: {
          lines: {
            where: { account: { code: { startsWith: '610' } } },
            select: { debit: true },
          },
        },
      });
      invoiceActual = journals.reduce(
        (sum, j) => sum + j.lines.reduce((s, l) => s + Number(l.debit), 0),
        0,
      );
    }

    return ledgerActual + invoiceActual;
  }

  /**
   * computeBatch — hitung actual cost untuk banyak project sekaligus (batch).
   * Dipakai oleh PortfolioService untuk menghindari N+1.
   * Returns Map<projectId, actualCost>.
   */
  async computeBatch(projectIds: string[]): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map();

    // 1. Batch ledger OUT per projectId
    const ledgerAgg = await this.prisma.stockLedgerEntry.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds }, movementType: 'OUT', totalValue: { not: null } },
      _sum: { totalValue: true },
    });
    const ledgerMap = new Map(ledgerAgg.map((r) => [r.projectId, Math.abs(Number(r._sum?.totalValue ?? 0))]));

    // 2. Batch posted vendor invoices → GL journal beban 610x per projectId
    const postedInvoices = await this.prisma.vendorInvoice.findMany({
      where: { projectId: { in: projectIds }, status: 'POSTED' },
      select: { id: true, projectId: true },
    });

    const invoiceCostMap = new Map<string, number>();
    if (postedInvoices.length > 0) {
      const invoiceProjectMap = new Map(postedInvoices.map((i) => [i.id, i.projectId]));
      const journals = await this.prisma.journal.findMany({
        where: {
          source: 'INVOICE',
          status: 'POSTED',
          sourceId: { in: postedInvoices.map((i) => i.id) },
        },
        include: {
          lines: {
            where: { account: { code: { startsWith: '610' } } },
            select: { debit: true },
          },
        },
      });
      for (const j of journals) {
        if (!j.sourceId) continue;
        const projectId = invoiceProjectMap.get(j.sourceId);
        if (!projectId) continue;
        const v = j.lines.reduce((s, l) => s + Number(l.debit), 0);
        invoiceCostMap.set(projectId, (invoiceCostMap.get(projectId) ?? 0) + v);
      }
    }

    // Gabungkan ledger + invoice per project
    const result = new Map<string, number>();
    for (const id of projectIds) {
      result.set(id, (ledgerMap.get(id) ?? 0) + (invoiceCostMap.get(id) ?? 0));
    }
    return result;
  }
}
