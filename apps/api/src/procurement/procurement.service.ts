import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreatePoDto, CreatePrDto, CreateQuoteDto, CreateRfqDto, ListPoQueryDto, ListPrQueryDto, ListRfqQueryDto } from './dto/procurement.dto';

@Injectable()
export class ProcurementService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ─── Purchase Requisition ────────────────────────────────────────────────

  async createPr(dto: CreatePrDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    if (dto.wbsItemId) {
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
      if (!wbs || wbs.projectId !== dto.projectId) {
        throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS tidak ditemukan di project ini' });
      }
    }

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'PR' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'PR', prefix: `PR-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const padded = String(s.nextNumber - 1).padStart(6, '0');
      return `${s.prefix}${padded}`;
    });

    const pr = await this.prisma.purchaseRequisition.create({
      data: {
        prNumber: seq,
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId ?? null,
        requestedBy: dto.requestedBy,
        description: dto.description ?? null,
        items: {
          create: dto.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit ?? 'EA',
            estimatedUnitPrice: item.estimatedUnitPrice ?? null,
            estimatedTotal: item.estimatedUnitPrice != null ? Number(item.estimatedUnitPrice) * Number(item.quantity) : null,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'PR.CREATE',
      resource: 'PurchaseRequisition',
      resourceId: pr.id,
      newValue: { prNumber: pr.prNumber, projectId: dto.projectId },
      source: 'api',
    });

    return pr;
  }

  async listPr(query: ListPrQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.PurchaseRequisitionWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseRequisition.findMany({
        where,
        include: { items: true, project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchaseRequisition.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── Purchase Order → commitment (FR-PRO-007) ────────────────────────────

  async createPo(dto: CreatePoDto, actorId: string) {
    const pr = await this.prisma.purchaseRequisition.findUnique({
      where: { id: dto.requisitionId },
      include: { items: true },
    });
    if (!pr) throw new NotFoundException({ code: 'PR_NOT_FOUND', message: 'Purchase Requisition tidak ditemukan' });
    if (pr.status !== 'APPROVED') {
      throw new ConflictException({ code: 'PR_NOT_APPROVED', message: 'PR harus APPROVED sebelum jadi PO' });
    }

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'PO' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'PO', prefix: `PO-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const totalAmount = pr.items.reduce(
      (sum, i) => sum + Number(i.estimatedTotal ?? (Number(i.estimatedUnitPrice) ?? 0) * Number(i.quantity)),
      0,
    );

    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber: seq,
        projectId: pr.projectId,
        requisitionId: pr.id,
        vendor: dto.vendor,
        currency: dto.currency ?? 'IDR',
        totalAmount,
        items: {
          create: pr.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: Number(i.estimatedUnitPrice) ?? 0,
            totalPrice: Number(i.estimatedTotal) ?? (Number(i.estimatedUnitPrice) ?? 0) * Number(i.quantity),
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'PO.CREATE',
      resource: 'PurchaseOrder',
      resourceId: po.id,
      newValue: { poNumber: po.poNumber, requisition: pr.prNumber, totalAmount: Number(totalAmount) },
      source: 'api',
    });

    return po;
  }

  async listPo(query: ListPoQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: { items: true, project: { select: { code: true, name: true } }, requisition: { select: { prNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async releasePo(id: string, actorId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException({ code: 'PO_NOT_FOUND', message: 'PO tidak ditemukan' });
    if (po.status !== 'APPROVED') {
      throw new ConflictException({ code: 'PO_NOT_APPROVED', message: 'PO harus APPROVED sebelum release' });
    }

    const released = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'RELEASED', issuedAt: new Date(), releasedBy: actorId },
    });

    await this.audit.record({
      userId: actorId,
      action: 'PO.RELEASE',
      resource: 'PurchaseOrder',
      resourceId: id,
      newValue: { poNumber: po.poNumber, totalAmount: Number(po.totalAmount) },
      source: 'api',
    });

    return released;
  }

  // ─── RFQ + Vendor Evaluation (FR-PRO-003/004) ──────────────────────────────

  async createRfq(dto: CreateRfqDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'RFQ' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'RFQ', prefix: `RFQ-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const rfq = await this.prisma.rfq.create({
      data: {
        rfqNumber: seq,
        projectId: dto.projectId,
        requisitionId: dto.requisitionId ?? null,
        title: dto.title,
        description: dto.description ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        createdBy: actorId,
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

    await this.audit.record({
      userId: actorId,
      action: 'Rfq.CREATE',
      resource: 'Rfq',
      resourceId: rfq.id,
      newValue: { rfqNumber: seq, title: dto.title, projectId: dto.projectId },
      source: 'api',
    });

    return rfq;
  }

  async sendRfq(id: string, actorId: string) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id } });
    if (!rfq) throw new NotFoundException({ code: 'RFQ_NOT_FOUND', message: 'RFQ tidak ditemukan' });
    if (rfq.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa dikirim (${rfq.status})` });
    }

    const sent = await this.prisma.rfq.update({ where: { id }, data: { status: 'SENT' } });

    await this.audit.record({
      userId: actorId,
      action: 'Rfq.SEND',
      resource: 'Rfq',
      resourceId: id,
      newValue: { rfqNumber: rfq.rfqNumber },
      source: 'api',
    });

    return sent;
  }

  async createQuote(rfqId: string, dto: CreateQuoteDto, actorId: string) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id: rfqId }, include: { items: true } });
    if (!rfq) throw new NotFoundException({ code: 'RFQ_NOT_FOUND', message: 'RFQ tidak ditemukan' });
    if (rfq.status !== 'SENT' && rfq.status !== 'QUOTED') {
      throw new ConflictException({ code: 'RFQ_NOT_OPEN', message: 'RFQ harus SENT untuk menerima quote' });
    }

    const existing = await this.prisma.rfqQuote.findUnique({ where: { rfqId_vendor: { rfqId, vendor: dto.vendor } } });
    if (existing) throw new ConflictException({ code: 'QUOTE_EXISTS', message: `Vendor ${dto.vendor} sudah memberi quote` });

    const rfqItemMap = new Map(rfq.items.map((i) => [i.id, i]));
    let totalAmount = 0;
    const items = dto.items.map((item) => {
      const rfqItem = rfqItemMap.get(item.rfqItemId);
      if (!rfqItem) throw new NotFoundException({ code: 'RFQ_ITEM_NOT_FOUND', message: `Item RFQ ${item.rfqItemId} tidak ada` });
      const totalPrice = Number(rfqItem.quantity) * Number(item.unitPrice);
      totalAmount += totalPrice;
      return { rfqItemId: item.rfqItemId, unitPrice: Number(item.unitPrice), totalPrice };
    });

    const quote = await this.prisma.rfqQuote.create({
      data: {
        rfqId,
        vendor: dto.vendor,
        leadTimeDays: dto.leadTimeDays ?? null,
        remark: dto.remark ?? null,
        totalAmount,
        items: { create: items },
      },
      include: { items: true },
    });

    // RFQ → QUOTED jika belum
    await this.prisma.rfq.update({ where: { id: rfqId }, data: { status: 'QUOTED' } });

    await this.audit.record({
      userId: actorId,
      action: 'Rfq.QUOTE',
      resource: 'Rfq',
      resourceId: rfqId,
      newValue: { quoteId: quote.id, vendor: dto.vendor, totalAmount: Number(totalAmount) },
      source: 'api',
    });

    return quote;
  }

  async evaluateRfq(id: string, actorId: string) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id }, include: { quotes: { include: { items: true } } } });
    if (!rfq) throw new NotFoundException({ code: 'RFQ_NOT_FOUND', message: 'RFQ tidak ditemukan' });
    if (rfq.status !== 'QUOTED' && rfq.status !== 'SENT') {
      throw new ConflictException({ code: 'NOT_QUOTED', message: 'RFQ belum punya quote' });
    }
    if (rfq.quotes.length === 0) {
      throw new ConflictException({ code: 'NO_QUOTES', message: 'Belum ada quote vendor' });
    }

    const ranked = rfq.quotes
      .filter((q) => q.status === 'SUBMITTED')
      .sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));

    const evaluated = await this.prisma.$transaction(async (tx) => {
      // tandai winner (harga terendah)
      const winner = ranked[0]!;
      await tx.rfqQuote.updateMany({ where: { rfqId: id, id: { not: winner.id } }, data: { isWinner: false } });
      await tx.rfqQuote.update({ where: { id: winner.id }, data: { isWinner: true } });
      const updated = await tx.rfq.update({
        where: { id },
        data: {
          status: 'EVALUATED',
          awardedVendor: winner.vendor,
          awardedQuoteId: winner.id,
        },
        include: { quotes: { include: { items: true } } },
      });
      return updated;
    });

    await this.audit.record({
      userId: actorId,
      action: 'Rfq.EVALUATE',
      resource: 'Rfq',
      resourceId: id,
      newValue: { rfqNumber: rfq.rfqNumber, winnerVendor: ranked[0]!.vendor, winnerAmount: Number(ranked[0]!.totalAmount) },
      source: 'api',
    });

    return evaluated;
  }

  async listRfqs(query: ListRfqQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.RfqWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rfq.findMany({
        where,
        include: {
          items: true,
          quotes: { include: { items: true } },
          project: { select: { code: true, name: true } },
          requisition: { select: { prNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rfq.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
