import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { buildTree, type TreeNode } from '@/shared/utils/tree.util';
import { computeWbsRollup } from './wbs-rollup';
import type { CreateWbsItemDto, MoveWbsItemDto, UpdateWbsItemDto } from '../../presentation/dto/wbs.dto';

function unwrapTree<T extends { id: string; parentId: string | null }>(
  nodes: TreeNode<T>[],
): Array<T & { children: Array<T & { children: unknown[] }> }> {
  return nodes.map((n) => ({ ...n.item, children: unwrapTree(n.children) as Array<T & { children: unknown[] }> }));
}

/** Relasi dokumen yang menghalangi hapus — dihitung untuk node + keturunannya. */
const LINK_COUNTERS = [
  { key: 'budgetItems', model: 'budgetItem', label: 'budget items' },
  { key: 'requisitions', model: 'purchaseRequisition', label: 'purchase requisitions' },
  { key: 'poItems', model: 'purchaseOrderItem', label: 'purchase order items' },
  { key: 'goodsReceiptItems', model: 'goodsReceiptItem', label: 'goods receipt items' },
  { key: 'stockLedgerEntries', model: 'stockLedgerEntry', label: 'stock ledger entries' },
  { key: 'materialIssueItems', model: 'materialIssueItem', label: 'material issue items' },
  { key: 'adjustmentItems', model: 'stockAdjustmentItem', label: 'stock adjustment items' },
  { key: 'opnameItems', model: 'stockOpnameItem', label: 'stock opname items' },
  { key: 'transferItems', model: 'stockTransferItem', label: 'stock transfer items' },
  { key: 'journalLines', model: 'journalLine', label: 'journal lines' },
  { key: 'rfqItems', model: 'rfqItem', label: 'RFQ items' },
  { key: 'workPackages', model: 'constructionWorkPackage', label: 'work packages' },
  { key: 'timesheets', model: 'timesheet', label: 'timesheets' },
  { key: 'costCodes', model: 'costCode', label: 'cost codes' },
  { key: 'controlAccounts', model: 'controlAccount', label: 'control accounts' },
] as const;

/** Node WBS yang dikembalikan API: baris Prisma + rollup read-only + anak. */
export type WbsTreeNode = {
  id: string;
  [key: string]: unknown;
  rollup: { budget: number; actual: number; progress: number | null; childCount: number };
  children: WbsTreeNode[];
};

@Injectable()
export class WbsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getTree(projectId: string) {
    const items = await this.prisma.wbsItem.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    const tree = buildTree(items);
    const flat = unwrapTree(tree);

    // Rollup: budget per item (semua status) + actual per item (stock ledger OUT,
    // definisi yang sama dengan project-health.service.ts).
    const budgetRows = await this.prisma.budgetItem.groupBy({
      by: ['wbsItemId'],
      where: { projectId },
      _sum: { amount: true },
    });
    const ledgerRows = await this.prisma.stockLedgerEntry.groupBy({
      by: ['wbsItemId'],
      where: { projectId, movementType: 'OUT', totalValue: { not: null } },
      _sum: { totalValue: true },
    });

    const ownBudget = new Map<string, number>();
    for (const r of budgetRows) ownBudget.set(r.wbsItemId, Number(r._sum?.amount ?? 0));
    const ownActual = new Map<string, number>();
    for (const r of ledgerRows) {
      if (!r.wbsItemId) continue;
      ownActual.set(r.wbsItemId, Math.abs(Number(r._sum?.totalValue ?? 0)));
    }
    const ownProgress = new Map<string, number>();
    for (const it of items) ownProgress.set(it.id, Number(it.progressPercent));

    const rollup = computeWbsRollup(
      items.map((i) => ({ id: i.id, parentId: i.parentId })),
      ownBudget,
      ownActual,
      ownProgress,
    );

    const withRollup = (node: { id: string; children: unknown[] }): WbsTreeNode =>
      ({
        ...node,
        rollup: rollup.get(node.id) ?? { budget: 0, actual: 0, progress: null, childCount: 0 },
        children: (node.children as Array<{ id: string; children: unknown[] }>).map(withRollup),
      }) as WbsTreeNode;

    return (flat as unknown as Array<{ id: string; children: unknown[] }>).map(withRollup);
  }

  async create(projectId: string, dto: CreateWbsItemDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    if (dto.parentId) {
      const parent = await this.prisma.wbsItem.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.projectId !== projectId) {
        throw new NotFoundException({ code: 'WBS_PARENT_NOT_FOUND', message: 'Parent WBS not found in this project' });
      }
    }

    const existing = await this.prisma.wbsItem.findUnique({
      where: { projectId_code: { projectId, code: dto.code } },
    });
    if (existing) throw new ConflictException({ code: 'WBS_EXISTS', message: 'WBS code already exists in this project' });

    const item = await this.prisma.wbsItem.create({
      data: {
        projectId,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        progressPercent: dto.progressPercent ?? 0,
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : null,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : null,
        responsibleManager: dto.responsibleManager ?? null,
        isMilestone: dto.isMilestone ?? false,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'WBS.CREATE',
      resource: 'WbsItem',
      resourceId: item.id,
      newValue: { projectId, code: item.code, parentId: item.parentId },
      source: 'api',
    });

    return item;
  }

  async update(projectId: string, itemId: string, dto: UpdateWbsItemDto, actorId: string) {
    const item = await this.prisma.wbsItem.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) {
      throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS item not found in this project' });
    }

    if (dto.code && dto.code !== item.code) {
      const clash = await this.prisma.wbsItem.findUnique({
        where: { projectId_code: { projectId, code: dto.code } },
      });
      if (clash) throw new ConflictException({ code: 'WBS_EXISTS', message: 'WBS code already exists in this project' });
    }

    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.progressPercent !== undefined) data.progressPercent = dto.progressPercent;
    if (dto.plannedStart !== undefined) data.plannedStart = dto.plannedStart ? new Date(dto.plannedStart) : null;
    if (dto.plannedEnd !== undefined) data.plannedEnd = dto.plannedEnd ? new Date(dto.plannedEnd) : null;
    if (dto.responsibleManager !== undefined) data.responsibleManager = dto.responsibleManager;
    if (dto.isMilestone !== undefined) data.isMilestone = dto.isMilestone;

    const updated = await this.prisma.wbsItem.update({ where: { id: itemId }, data });

    await this.audit.record({
      userId: actorId,
      action: 'WBS.UPDATE',
      resource: 'WbsItem',
      resourceId: itemId,
      newValue: { projectId, code: updated.code, changed: Object.keys(data) },
      source: 'api',
    });

    return updated;
  }

  /** Semua id di subtree `rootId` (termasuk root), urut dari terdalam. */
  private async collectSubtree(projectId: string, rootId: string): Promise<string[]> {
    const items = await this.prisma.wbsItem.findMany({
      where: { projectId },
      select: { id: true, parentId: true },
    });
    const childrenOf = new Map<string, string[]>();
    for (const it of items) {
      if (it.parentId) {
        const list = childrenOf.get(it.parentId) ?? [];
        list.push(it.id);
        childrenOf.set(it.parentId, list);
      }
    }
    const ordered: string[] = [];
    const walk = (id: string) => {
      for (const c of childrenOf.get(id) ?? []) walk(c);
      ordered.push(id);
    };
    walk(rootId);
    return ordered;
  }

  /** Hitung dokumen tertaut untuk sekumpulan id WBS, per jenis. */
  private async countLinks(subtreeIds: string[]) {
    const client = this.prisma as unknown as Record<string, { count: (args: unknown) => Promise<number> }>;
    const links: Array<{ key: string; label: string; count: number }> = [];
    let total = 0;
    for (const counter of LINK_COUNTERS) {
      const model = client[counter.model]!;
      const count = await model.count({ where: { wbsItemId: { in: subtreeIds } } });
      if (count > 0) {
        links.push({ key: counter.key, label: counter.label, count });
        total += count;
      }
    }
    return { links, total };
  }

  /** Dokumen tertaut untuk node + keturunannya (dipakai inspector & guard hapus). */
  async getLinks(projectId: string, itemId: string) {
    const item = await this.prisma.wbsItem.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) {
      throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS item not found in this project' });
    }
    const subtreeIds = await this.collectSubtree(projectId, itemId);
    const { links, total } = await this.countLinks(subtreeIds);
    return { itemId, links, total };
  }

  async remove(projectId: string, itemId: string, actorId: string) {
    const item = await this.prisma.wbsItem.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) {
      throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS item not found in this project' });
    }

    const subtreeIds = await this.collectSubtree(projectId, itemId);

    // Guard: hapus tidak boleh cascade budget/cost code/control account atau
    // memutus dokumen yang mereferensikan node ini.
    const { links, total } = await this.countLinks(subtreeIds);
    if (total > 0) {
      const counts: Record<string, number> = {};
      for (const l of links) counts[l.label] = l.count;
      throw new ConflictException({
        code: 'WBS_HAS_LINKS',
        message: 'This WBS item (or its descendants) is referenced by other records and cannot be deleted',
        details: counts,
      });
    }

    await this.prisma.wbsItem.deleteMany({ where: { id: { in: subtreeIds } } });

    await this.audit.record({
      userId: actorId,
      action: 'WBS.DELETE',
      resource: 'WbsItem',
      resourceId: itemId,
      newValue: { projectId, code: item.code, removed: subtreeIds.length },
      source: 'api',
    });

    return { id: itemId, removed: subtreeIds.length };
  }

  async move(projectId: string, itemId: string, dto: MoveWbsItemDto, actorId: string) {
    const item = await this.prisma.wbsItem.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) {
      throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS item not found in this project' });
    }

    const targetParentId = dto.parentId ?? null;

    if (targetParentId) {
      if (targetParentId === itemId) {
        throw new BadRequestException({ code: 'WBS_CYCLE', message: 'An item cannot be its own parent' });
      }
      const parent = await this.prisma.wbsItem.findUnique({ where: { id: targetParentId } });
      if (!parent || parent.projectId !== projectId) {
        throw new NotFoundException({ code: 'WBS_PARENT_NOT_FOUND', message: 'Parent WBS not found in this project' });
      }
      const subtree = await this.collectSubtree(projectId, itemId);
      if (subtree.includes(targetParentId)) {
        throw new BadRequestException({ code: 'WBS_CYCLE', message: 'Cannot move an item under its own descendant' });
      }
    }

    const data: Record<string, unknown> = { parentId: targetParentId };
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const updated = await this.prisma.wbsItem.update({ where: { id: itemId }, data });

    await this.audit.record({
      userId: actorId,
      action: 'WBS.MOVE',
      resource: 'WbsItem',
      resourceId: itemId,
      newValue: { projectId, code: updated.code, parentId: targetParentId },
      source: 'api',
    });

    return updated;
  }
}
