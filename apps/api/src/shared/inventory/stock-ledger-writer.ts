import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

/**
 * StockLedgerWriter — terpusat untuk menulis stock ledger entries dengan running balance.
 * Menggantikan pola `balanceKeys → balances → createMany` yang identik di 4 inventory services:
 *   - goods-receipt.service.ts
 *   - material-issue.service.ts
 *   - stock-adjustment.service.ts
 *   - stock-transfer.service.ts
 */
export interface LedgerLine {
  projectId: string;
  wbsItemId: string | null;
  warehouseId: string;
  documentType: string;
  documentId: string;
  reference: string;
  description: string;
  movementType: 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT';
  quantity: number;
  unit: string;
  unitPrice: number | null;
  totalValue: number | null;
}

// Interface minimal untuk tx dari Prisma.$transaction
interface LedgerTx {
  stockLedgerEntry: PrismaService['stockLedgerEntry'];
}

@Injectable()
export class StockLedgerWriter {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Tulis batch ledger lines dalam satu transaksi Prisma yang sudah aktif.
   * Hitung running balance otomatis per (projectId, wbsItemId, warehouseId).
   *
   * Contoh pakai (di dalam $transaction):
   *   await this.prisma.$transaction(async (tx) => {
   *     // ... buat dokumen utama ...
   *     await this.ledger.write(tx, lines);
   *   });
   */
  async write(tx: LedgerTx, lines: LedgerLine[]): Promise<void> {
    if (lines.length === 0) return;

    // Kumpulkan unique bucket keys untuk query balance sekaligus
    const bucketKeys = new Set(
      lines.map((l) => `${l.projectId}|${l.wbsItemId ?? 'NULL'}|${l.warehouseId}`),
    );

    // Query running balance saat ini per bucket
    const balances: Record<string, number> = {};
    for (const key of bucketKeys) {
      const [projectId, wbsItemId, warehouseId] = key.split('|');
      const agg = await tx.stockLedgerEntry.aggregate({
        where: {
          projectId,
          warehouseId,
          wbsItemId: wbsItemId === 'NULL' ? null : wbsItemId,
        },
        _sum: { quantity: true },
      });
      balances[key] = Number(agg._sum.quantity ?? 0);
    }

    // Tulis semua lines sekaligus dengan running balance
    await tx.stockLedgerEntry.createMany({
      data: lines.map((l) => {
        const key = `${l.projectId}|${l.wbsItemId ?? 'NULL'}|${l.warehouseId}`;
        const sign = ['OUT', 'TRANSFER_OUT'].includes(l.movementType) ? -1 : 1;
        const running = (balances[key] ?? 0) + sign * l.quantity;
        balances[key] = running;
        return {
          projectId: l.projectId,
          wbsItemId: l.wbsItemId,
          warehouseId: l.warehouseId,
          documentType: l.documentType,
          documentId: l.documentId,
          reference: l.reference,
          description: l.description,
          movementType: l.movementType,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          totalValue: l.totalValue,
          balanceAfter: String(running),
        };
      }),
    });
  }
}
