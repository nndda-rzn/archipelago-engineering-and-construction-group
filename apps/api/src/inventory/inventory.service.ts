import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type {
  CreateGoodsReceiptDto,
  CreateMaterialIssueDto,
  CreateStockTransferDto,
  CreateWarehouseDto,
  ListGoodsReceiptQueryDto,
  ListMaterialIssueQueryDto,
  ListStockLedgerQueryDto,
  ListStockTransferQueryDto,
  ListWarehouseQueryDto,
} from './dto/inventory.dto';

// Inventory domain — FR-INV-001 (stock ledger), FR-INV-002 (warehouse),
// FR-PRO-009 (receipt leg of three-way match: PO → Receipt → Invoice)
@Injectable()
export class InventoryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ─── Warehouse (FR-INV-002) ────────────────────────────────────────────────

  async createWarehouse(dto: CreateWarehouseDto, actorId: string) {
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        code: dto.code,
        name: dto.name,
        warehouseType: dto.warehouseType ?? 'PROJECT',
        projectId: dto.projectId ?? null,
        location: dto.location ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Warehouse.CREATE',
      resource: 'Warehouse',
      resourceId: warehouse.id,
      newValue: { code: warehouse.code, warehouseType: warehouse.warehouseType },
      source: 'api',
    });

    return warehouse;
  }

  async listWarehouses(query: ListWarehouseQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.WarehouseWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        include: { project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── Goods Receipt (FR-PRO-009 receipt leg) ────────────────────────────────

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

    // Validasi item → PO item + tidak melebihi outstanding (anti over-receipt)
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
        const key = `${po.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.warehouseId}`;
        balanceKeys.add(key);
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

  // ─── Material Issue (FR-INV-004) ───────────────────────────────────────────

  async createMaterialIssue(dto: CreateMaterialIssueDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new NotFoundException({ code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse tidak ditemukan' });
    if (warehouse.projectId && warehouse.projectId !== dto.projectId) {
      throw new ConflictException({ code: 'WAREHOUSE_PROJECT_MISMATCH', message: 'Warehouse bukan milik project ini' });
    }

    // Validasi WBS item milik project
    for (const item of dto.items) {
      if (!item.wbsItemId) continue;
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: item.wbsItemId } });
      if (!wbs || wbs.projectId !== dto.projectId) {
        throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: `WBS ${item.wbsItemId} tidak ada di project ini` });
      }
    }

    // Cek ketersediaan stok per (wbsItemId, warehouse) — anti over-issue
    const available = new Map<string, number>();
    for (const item of dto.items) {
      const key = `${item.wbsItemId ?? 'NULL'}|${dto.warehouseId}`;
      if (available.has(key)) continue;
      const agg = await this.prisma.stockLedgerEntry.aggregate({
        where: { projectId: dto.projectId, warehouseId: dto.warehouseId, wbsItemId: item.wbsItemId ?? null },
        _sum: { quantity: true, totalValue: true },
      });
      available.set(key, Number(agg._sum.quantity ?? 0));
      // catat harga rata-rata untuk cost issue
      const qty = Number(agg._sum.quantity ?? 0);
      const value = Number(agg._sum.totalValue ?? 0);
      available.set(`${key}|value`, qty > 0 ? value / qty : 0);
    }

    const issuedItems = dto.items.map((item) => {
      const key = `${item.wbsItemId ?? 'NULL'}|${dto.warehouseId}`;
      const onHand = available.get(key) ?? 0;
      if (Number(item.quantity) > onHand) {
        throw new ConflictException({
          code: 'INSUFFICIENT_STOCK',
          message: `Stok tidak cukup untuk "${item.description}" (tersedia ${onHand} ${item.unit ?? 'EA'})`,
        });
      }
      const avgPrice = available.get(`${key}|value`) ?? 0;
      return {
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit ?? 'EA',
        wbsItemId: item.wbsItemId ?? null,
        unitPrice: avgPrice,
        totalValue: avgPrice * Number(item.quantity),
      };
    });

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'MI' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'MI', prefix: `MI-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const issue = await this.prisma.$transaction(async (tx) => {
      const created = await tx.materialIssue.create({
        data: {
          issueNumber: seq,
          projectId: dto.projectId,
          warehouseId: dto.warehouseId,
          issuedTo: dto.issuedTo,
          issueReason: dto.issueReason ?? 'CONSTRUCTION',
          issuedBy: actorId,
          remark: dto.remark ?? null,
          items: { create: issuedItems },
        },
        include: { items: true },
      });

      // Ledger OUT (qty negatif) + running balance
      const balanceKeys = new Set<string>();
      for (const item of created.items) {
        balanceKeys.add(`${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.warehouseId}`);
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
          const key = `${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.warehouseId}`;
          const running = (balances[key] ?? 0) - Number(item.quantity);
          balances[key] = running;
          return {
            projectId: dto.projectId,
            wbsItemId: item.wbsItemId ?? null,
            warehouseId: dto.warehouseId,
            documentType: 'ISSUE',
            documentId: item.id,
            reference: seq,
            description: `Material issue ke ${dto.issuedTo}`,
            movementType: 'OUT',
            quantity: -Number(item.quantity),
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalValue: item.totalValue != null ? -Number(item.totalValue) : null,
            balanceAfter: String(running),
          };
        }),
      });

      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'MaterialIssue.CREATE',
      resource: 'MaterialIssue',
      resourceId: issue.id,
      newValue: { issueNumber: issue.issueNumber, issuedTo: dto.issuedTo, itemCount: issue.items.length },
      source: 'api',
    });

    return issue;
  }

  async listMaterialIssues(query: ListMaterialIssueQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.MaterialIssueWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.materialIssue.findMany({
        where,
        include: {
          items: true,
          project: { select: { code: true, name: true } },
          warehouse: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.materialIssue.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── Stock Transfer (FR-INV-005) ───────────────────────────────────────────

  async createStockTransfer(dto: CreateStockTransferDto, actorId: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException({ code: 'SAME_WAREHOUSE', message: 'Warehouse asal dan tujuan harus berbeda' });
    }

    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const [fromWh, toWh] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: dto.fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.toWarehouseId } }),
    ]);
    if (!fromWh || !toWh) throw new NotFoundException({ code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse tidak ditemukan' });

    for (const item of dto.items) {
      if (!item.wbsItemId) continue;
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: item.wbsItemId } });
      if (!wbs || wbs.projectId !== dto.projectId) {
        throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: `WBS ${item.wbsItemId} tidak ada di project ini` });
      }
    }

    // Cek stok cukup di warehouse asal (anti over-transfer)
    for (const item of dto.items) {
      const agg = await this.prisma.stockLedgerEntry.aggregate({
        where: { projectId: dto.projectId, warehouseId: dto.fromWarehouseId, wbsItemId: item.wbsItemId ?? null },
        _sum: { quantity: true, totalValue: true },
      });
      const onHand = Number(agg._sum.quantity ?? 0);
      if (Number(item.quantity) > onHand) {
        throw new ConflictException({
          code: 'INSUFFICIENT_STOCK',
          message: `Stok tidak cukup di ${fromWh.code} untuk "${item.description}" (tersedia ${onHand} ${item.unit ?? 'EA'})`,
        });
      }
    }

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'ST' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'ST', prefix: `ST-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const transfer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stockTransfer.create({
        data: {
          transferNumber: seq,
          projectId: dto.projectId,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          transferredBy: actorId,
          remark: dto.remark ?? null,
          items: {
            create: dto.items.map((i) => ({
              description: i.description,
              quantity: Number(i.quantity),
              unit: i.unit ?? 'EA',
              wbsItemId: i.wbsItemId ?? null,
            })),
          },
        },
        include: { items: true },
      });

      // Hitung saldo semua bucket (source OUT + target IN)
      const bucketKeys = new Set<string>();
      for (const item of created.items) {
        bucketKeys.add(`${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.fromWarehouseId}`);
        bucketKeys.add(`${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.toWarehouseId}`);
      }
      const balances: Record<string, number> = {};
      for (const key of bucketKeys) {
        const [projectId, wbsItemId, warehouseId] = key.split('|');
        const agg = await tx.stockLedgerEntry.aggregate({
          where: { projectId, warehouseId, wbsItemId: wbsItemId === 'NULL' ? null : wbsItemId },
          _sum: { quantity: true },
        });
        balances[key] = Number(agg._sum.quantity ?? 0);
      }

      const ledgerRows: Prisma.StockLedgerEntryCreateManyInput[] = [];
      for (const item of created.items) {
        const outKey = `${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.fromWarehouseId}`;
        const inKey = `${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.toWarehouseId}`;
        const outBalance = (balances[outKey] ?? 0) - Number(item.quantity);
        const inBalance = (balances[inKey] ?? 0) + Number(item.quantity);
        balances[outKey] = outBalance;
        balances[inKey] = inBalance;

        ledgerRows.push({
          projectId: dto.projectId,
          wbsItemId: item.wbsItemId ?? null,
          warehouseId: dto.fromWarehouseId,
          documentType: 'TRANSFER_OUT',
          documentId: item.id,
          reference: seq,
          description: `Transfer ke ${toWh.code}`,
          movementType: 'OUT',
          quantity: -Number(item.quantity),
          unit: item.unit,
          balanceAfter: String(outBalance),
        });
        ledgerRows.push({
          projectId: dto.projectId,
          wbsItemId: item.wbsItemId ?? null,
          warehouseId: dto.toWarehouseId,
          documentType: 'TRANSFER_IN',
          documentId: item.id,
          reference: seq,
          description: `Transfer dari ${fromWh.code}`,
          movementType: 'IN',
          quantity: Number(item.quantity),
          unit: item.unit,
          balanceAfter: String(inBalance),
        });
      }
      await tx.stockLedgerEntry.createMany({ data: ledgerRows });

      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'StockTransfer.CREATE',
      resource: 'StockTransfer',
      resourceId: transfer.id,
      newValue: { transferNumber: seq, from: fromWh.code, to: toWh.code, itemCount: transfer.items.length },
      source: 'api',
    });

    return transfer;
  }

  async listStockTransfers(query: ListStockTransferQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.StockTransferWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockTransfer.findMany({
        where,
        include: {
          items: true,
          project: { select: { code: true, name: true } },
          fromWarehouse: { select: { code: true, name: true } },
          toWarehouse: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── Stock Ledger (FR-INV-001) ─────────────────────────────────────────────

  async listStockLedger(query: ListStockLedgerQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.StockLedgerEntryWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.wbsItemId ? { wbsItemId: query.wbsItemId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockLedgerEntry.findMany({
        where,
        include: {
          project: { select: { code: true } },
          wbsItem: { select: { code: true, name: true } },
          warehouse: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockLedgerEntry.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // Ringkasan stok saat ini per WBS item (diturunkan dari ledger — FR-INV-001)
  async stockSummary(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const groups = await this.prisma.stockLedgerEntry.groupBy({
      by: ['wbsItemId', 'warehouseId'],
      where: { projectId },
      _sum: { quantity: true, totalValue: true },
    });

    const wbsIds = [...new Set(groups.map((g) => g.wbsItemId).filter((x): x is string => !!x))];
    const warehouseIds = [...new Set(groups.map((g) => g.warehouseId))];
    const [wbsItems, warehouses] = await Promise.all([
      wbsIds.length ? this.prisma.wbsItem.findMany({ where: { id: { in: wbsIds } }, select: { id: true, code: true, name: true } }) : [],
      warehouseIds.length ? this.prisma.warehouse.findMany({ where: { id: { in: warehouseIds } }, select: { id: true, code: true, name: true } }) : [],
    ]);
    const wbsMap = new Map(wbsItems.map((w) => [w.id, w]));
    const whMap = new Map(warehouses.map((w) => [w.id, w]));

    return {
      projectId,
      items: groups
        .map((g) => ({
          wbsItemId: g.wbsItemId,
          wbsItem: g.wbsItemId ? { code: wbsMap.get(g.wbsItemId)?.code ?? '-', name: wbsMap.get(g.wbsItemId)?.name ?? '-' } : null,
          warehouseId: g.warehouseId,
          warehouse: { code: whMap.get(g.warehouseId)?.code ?? '-', name: whMap.get(g.warehouseId)?.name ?? '-' },
          quantity: Number(g._sum.quantity ?? 0),
          totalValue: Number(g._sum.totalValue ?? 0),
        }))
        .filter((i) => i.quantity !== 0),
    };
  }
}
