import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreateMaterialIssueDto, ListMaterialIssueQueryDto } from '../dto/inventory.dto';

@Injectable()
export class MaterialIssueService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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
        include: { items: true, project: { select: { code: true, name: true } }, warehouse: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.materialIssue.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}