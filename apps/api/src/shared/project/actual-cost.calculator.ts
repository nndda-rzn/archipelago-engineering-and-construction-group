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
}
