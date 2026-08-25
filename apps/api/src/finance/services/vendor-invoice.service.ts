import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { GlHelper } from './shared/gl.helper';
import type { CreateVendorInvoiceDto, ListVendorInvoiceQueryDto } from '../dto/finance.dto';

@Injectable()
export class VendorInvoiceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GlHelper) private readonly gl: GlHelper,
  ) {}

  async createVendorInvoice(dto: CreateVendorInvoiceDto, actorId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.poId },
      include: { items: true },
    });
    if (!po) throw new NotFoundException({ code: 'PO_NOT_FOUND', message: 'PO tidak ditemukan' });
    if (po.status !== 'RELEASED') {
      throw new ConflictException({ code: 'PO_NOT_RELEASED', message: 'PO harus RELEASED sebelum invoice' });
    }

    const receivedAgg = await this.prisma.goodsReceiptItem.groupBy({
      by: ['poItemId'],
      where: { poItemId: { in: dto.items.map((i) => i.poItemId) }, goodsReceipt: { status: { not: 'CANCELLED' } } },
      _sum: { quantity: true },
    });
    const receivedMap = new Map(receivedAgg.map((r) => [r.poItemId, Number(r._sum.quantity ?? 0)]));

    const poItemMap = new Map(po.items.map((i) => [i.id, i]));

    let amount = 0;
    const items = dto.items.map((item) => {
      const poItem = poItemMap.get(item.poItemId);
      if (!poItem) throw new NotFoundException({ code: 'PO_ITEM_NOT_FOUND', message: `Item PO ${item.poItemId} tidak ada` });

      const receivedQty = receivedMap.get(item.poItemId) ?? 0;
      const totalPrice = Number(item.quantity) * Number(item.unitPrice);
      amount += totalPrice;

      const matchStatus = Number(item.quantity) <= receivedQty ? 'MATCHED' : 'MISMATCH';

      return {
        poItemId: poItem.id,
        description: poItem.description,
        quantity: Number(item.quantity),
        unit: poItem.unit,
        unitPrice: Number(item.unitPrice),
        totalPrice,
        receivedQuantity: receivedQty,
        matchStatus,
      };
    });

    const mismatchCount = items.filter((i) => i.matchStatus === 'MISMATCH').length;
    if (mismatchCount > 0) {
      throw new ConflictException({
        code: 'THREE_WAY_MISMATCH',
        message: `Qty invoice melebihi qty diterima (GR) pada ${mismatchCount} item`,
      });
    }

    const taxAmount = dto.taxAmount != null ? Number(dto.taxAmount) : 0;
    const totalAmount = amount + taxAmount;

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'INV' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'INV', prefix: `INV-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const invoice = await this.prisma.vendorInvoice.create({
      data: {
        invoiceNumber: seq,
        poId: po.id,
        projectId: po.projectId,
        vendor: po.vendor,
        vendorInvoiceNo: dto.vendorInvoiceNo,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
        taxAmount,
        amount,
        totalAmount,
        status: 'MATCHED',
        matchedAt: new Date(),
        remark: dto.remark ?? null,
        items: { create: items },
      },
      include: { items: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'VendorInvoice.CREATE',
      resource: 'VendorInvoice',
      resourceId: invoice.id,
      newValue: { invoiceNumber: seq, vendorInvoiceNo: dto.vendorInvoiceNo, totalAmount: Number(totalAmount), poNumber: po.poNumber },
      source: 'api',
    });

    return invoice;
  }

  async postVendorInvoice(id: string, actorId: string) {
    const invoice = await this.prisma.vendorInvoice.findUnique({
      where: { id },
      include: { items: true, project: { select: { legalEntityId: true } } },
    });
    if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: 'Invoice tidak ditemukan' });
    if (invoice.status !== 'MATCHED') {
      throw new ConflictException({ code: 'NOT_MATCHED', message: `Hanya MATCHED yang bisa diposting (status: ${invoice.status})` });
    }

    const posted = await this.prisma.vendorInvoice.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date(), postedBy: actorId },
    });

    await this.audit.record({
      userId: actorId,
      action: 'VendorInvoice.POST',
      resource: 'VendorInvoice',
      resourceId: id,
      newValue: { invoiceNumber: invoice.invoiceNumber, totalAmount: Number(invoice.totalAmount) },
      source: 'api',
    });

    await this.gl.postInvoiceJournal(
      {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        legalEntityId: invoice.project.legalEntityId,
        totalAmount: Number(invoice.totalAmount),
        amount: Number(invoice.amount),
        taxAmount: invoice.taxAmount != null ? Number(invoice.taxAmount) : null,
      },
      actorId,
    );

    return posted;
  }

  async listVendorInvoices(query: ListVendorInvoiceQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.VendorInvoiceWhereInput = {
      ...(query.poId ? { poId: query.poId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vendorInvoice.findMany({
        where,
        include: { items: true, project: { select: { code: true, name: true } }, po: { select: { poNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.vendorInvoice.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}