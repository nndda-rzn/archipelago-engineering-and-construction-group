import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

@Injectable()
export class ActualCostCalculator {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async compute(projectId: string): Promise<number> {

    const ledgerOut = await this.prisma.stockLedgerEntry.aggregate({
      where: { projectId, movementType: 'OUT', totalValue: { not: null } },
      _sum: { totalValue: true },
    });
    const ledgerActual = Math.abs(Number(ledgerOut._sum?.totalValue ?? 0));

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

  async computeBatch(projectIds: string[]): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map();

    const ledgerAgg = await this.prisma.stockLedgerEntry.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds }, movementType: 'OUT', totalValue: { not: null } },
      _sum: { totalValue: true },
    });
    const ledgerMap = new Map(ledgerAgg.map((r) => [r.projectId, Math.abs(Number(r._sum?.totalValue ?? 0))]));

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

    const result = new Map<string, number>();
    for (const id of projectIds) {
      result.set(id, (ledgerMap.get(id) ?? 0) + (invoiceCostMap.get(id) ?? 0));
    }
    return result;
  }
}
