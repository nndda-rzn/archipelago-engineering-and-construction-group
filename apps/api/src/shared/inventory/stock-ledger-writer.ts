import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

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

interface LedgerTx {
  stockLedgerEntry: PrismaService['stockLedgerEntry'];
}

@Injectable()
export class StockLedgerWriter {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async write(tx: LedgerTx, lines: LedgerLine[]): Promise<void> {
    if (lines.length === 0) return;

    const bucketKeys = new Set(
      lines.map((l) => `${l.projectId}|${l.wbsItemId ?? 'NULL'}|${l.warehouseId}`),
    );

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

    await tx.stockLedgerEntry.createMany({
      data: lines.map((l) => {
        const key = `${l.projectId}|${l.wbsItemId ?? 'NULL'}|${l.warehouseId}`;
        const sign = ['OUT', 'TRANSFER_OUT'].includes(l.movementType) ? -1 : 1;
        const signedQty = sign * l.quantity;
        const running = (balances[key] ?? 0) + signedQty;
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
          // `quantity` BERTANDA (positif IN / negatif OUT) — selaras schema & semua
          // pembaca yang menghitung saldo via `_sum(quantity)`. Menyimpan qty mentah
          // membuat saldo tidak pernah berkurang (guard stok keluar jadi no-op).
          quantity: signedQty,
          unit: l.unit,
          unitPrice: l.unitPrice,
          totalValue: l.totalValue,
          balanceAfter: String(running),
        };
      }),
    });
  }
}
