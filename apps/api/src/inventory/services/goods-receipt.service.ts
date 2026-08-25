import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateGoodsReceiptDto, ListGoodsReceiptQueryDto } from '../dto/inventory.dto';

@Injectable()
export class GoodsReceiptService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createGoodsReceipt(dto: CreateGoodsReceiptDto, actorId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.poId },
      include: { items: true },
    });
    if (!po) throw new NotFoundException({ code: 'PO_NOT_FOUND', message: 'PO tidak ditemukan' });
    if (po.status !== 'RELEASED') {
      throw new ConflictException({ code: 'PO_NOT_RELEASED', message: 'PO harus RELEASED sebelum goods receipt' });
    }

    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new NotFoundException({ code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse tidak ditemukan' });
    if (warehouse.projectId && warehouse.projectId !== po.projectId) {
      throw new ConflictException({ code: 'WAREHOUSE_PROJECT_MISMATCH', message: 'Warehouse bukan milik project PO' });
    }

    const poItemMap = new Map(po.items.map((i) => [i.id, i]));
    const receivedSoFar = await this.prisma.goodsReceiptItem.groupBy({
      by: ['poItemId'],
      where: { poItemId: { in: dto.items.map((i) => i.poItemId) }, goodsReceipt: { status: { not: 'CANCELLED' } } },
      _sum: { quantity: true },
    });
    const receivedMap = new Map(receivedSoFar.map((r) => [r.poItemId, Number(r._sum.quantity ?? 0)]));

    const items = dto.items.map((item) => {
      const poItem = poItemMap.get(item.poItemId);
      if (!poItem) throw new NotFoundException({ code: 'PO_ITEM_NOT_FOUND', message: `Item PO ${item.poItemId} tidak ada` });
      const outstanding = Number(poItem.quantity) - (receivedMap.get(item.poItemId) ?? 0);
      if (Number(item.quantity) > outstanding) {
        throw new ConflictException({
          code: 'OVER_RECEIPT',
          message: `Qty melebihi sisa outstanding item "${poItem.description}" (sisa ${outstanding} ${poItem.unit})`,
        });
      }
      return {
        poItem,
        quantity: Number(item.quantity),
        wbsItemId: item.wbsItemId ?? poItem.wbsItemId ?? null,
      };
    });

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'GR' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'GR', prefix: `GR-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    // POSTED + stock ledger dalam 1 transaksi (FR-INV-001: semua perubahan = movement)
    const gr = await this.prisma.$transaction(async (tx) => {
      const created = await tx.goodsReceipt.create({
        data: {
          grNumber: seq,
          poId: po.id,
          projectId: po.projectId,
          warehouseId: dto.warehouseId,
          receivedBy: actorId,
          remark: dto.remark ?? null,
          items: {
            create: items.map((i) => ({
              poItemId: i.poItem.id,
              description: i.poItem.description,
              quantity: i.quantity,
              unit: i.poItem.unit,
              unitPrice: i.poItem.unitPrice,
              wbsItemId: i.wbsItemId,
            })),
          },
        },
        include: { items: true },
      });

      // Perbarui running balance per (projectId, wbsItemId, warehouseId)
      const balanceKeys = new Set<string>();
      for (const item of created.items) {
        balanceKeys.add(`${po.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.warehouseId}`);
      }

      const balances: Record<string, number> = {};
      for (const key of balanceKeys) {
        const [projectId, wbsItemId, warehouseId] = key.split('|');
        const agg = await tx.stockLedgerEntry.aggregate({
          where: { projectId, warehouseId, wbsItemId: wbsItemId === 'NULL' ? null : wbsItemId },
          _sum: { quantity: true },
        });
        balances[key] = Number(agg._sum.quantity ?? 0);
      }

      await tx.stockLedgerEntry.createMany({
        data: created.items.map((item) => {
          const key = `${po.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.warehouseId}`;
          const running = (balances[key] ?? 0) + Number(item.quantity);
          balances[key] = running;
          return {
            projectId: po.projectId,
            wbsItemId: item.wbsItemId ?? null,
            warehouseId: dto.warehouseId,
            documentType: 'GR',
            documentId: item.id,
            reference: seq,
            description: `Goods receipt dari ${po.poNumber}`,
            movementType: 'IN',
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalValue: item.unitPrice != null ? Number(item.unitPrice) * Number(item.quantity) : null,
            balanceAfter: String(running),
          };
        }),
      });

      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'GR.CREATE',
      resource: 'GoodsReceipt',
      resourceId: gr.id,
      newValue: { grNumber: gr.grNumber, poNumber: po.poNumber, warehouse: warehouse.code, itemCount: gr.items.length },
      source: 'api',
    });

    return gr;
  }

  async listGoodsReceipts(query: ListGoodsReceiptQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.GoodsReceiptWhereInput = {
      ...(query.poId ? { poId: query.poId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.goodsReceipt.findMany({
        where,
        include: {
          items: true,
          project: { select: { code: true, name: true } },
          warehouse: { select: { code: true, name: true } },
          po: { select: { poNumber: true, vendor: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}