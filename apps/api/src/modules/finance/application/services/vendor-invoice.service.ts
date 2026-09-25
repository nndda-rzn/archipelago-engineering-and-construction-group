import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { GlHelper } from './shared/gl.helper';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import { withSerializableRetry } from '@/shared/database/serializable-tx';
import type { CreateVendorInvoiceDto, ListVendorInvoiceQueryDto } from '../../presentation/dto/finance.dto';

@Injectable()
export class VendorInvoiceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GlHelper) private readonly gl: GlHelper,
    @Inject(CacheService) private readonly cache: CacheService,
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

    const poItemMap = new Map(po.items.map((i) => [i.id, i]));

    // Cek 3-way match (qty diterima vs qty invoice) + tulis dalam SATU transaksi Serializable:
    // menutup TOCTOU — dua invoice paralel tidak bisa sama-sama melebihi qty diterima (GR).
    const invoice = await withSerializableRetry(
      this.prisma,
      async (tx) => {
        const receivedAgg = await tx.goodsReceiptItem.groupBy({
          by: ['poItemId'],
          where: { poItemId: { in: dto.items.map((i) => i.poItemId) }, goodsReceipt: { status: { not: 'CANCELLED' } } },
          _sum: { quantity: true },
        });
        const receivedMap = new Map(receivedAgg.map((r) => [r.poItemId, Number(r._sum.quantity ?? 0)]));

        // A receipt may only be invoiced once up to its received quantity. The
        // prior check compared each invoice solely with GR quantity, so even
        // SERIALIZABLE allowed a second invoice after the first committed.
        const invoicedAgg = await tx.vendorInvoiceItem.groupBy({
          by: ['poItemId'],
          where: {
            poItemId: { in: dto.items.map((i) => i.poItemId) },
            vendorInvoice: { status: { notIn: ['CANCELLED', 'REJECTED'] } },
          },
          _sum: { quantity: true },
        });
        const invoicedMap = new Map(invoicedAgg.map((r) => [r.poItemId, Number(r._sum.quantity ?? 0)]));

        let amount = 0;
        const items = dto.items.map((item) => {
          const poItem = poItemMap.get(item.poItemId);
          if (!poItem) throw new NotFoundException({ code: 'PO_ITEM_NOT_FOUND', message: `Item PO ${item.poItemId} tidak ada` });

          const receivedQty = receivedMap.get(item.poItemId) ?? 0;
          const totalPrice = Number(item.quantity) * Number(item.unitPrice);
          amount += totalPrice;

          const remaining = receivedQty - (invoicedMap.get(poItem.id) ?? 0);
          const matchStatus = Number(item.quantity) <= remaining + 0.001 ? 'MATCHED' : 'MISMATCH';
          invoicedMap.set(poItem.id, (invoicedMap.get(poItem.id) ?? 0) + Number(item.quantity));

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

        const s = await tx.numberSequence.upsert({
          where: { code: 'INV' },
          update: { nextNumber: { increment: 1 } },
          create: { code: 'INV', prefix: `INV-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
        });
        const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
        return tx.vendorInvoice.create({
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
      },
      { label: 'VendorInvoice.create' },
    );

    await this.audit.record({
      userId: actorId,
      action: 'VendorInvoice.CREATE',
      resource: 'VendorInvoice',
      resourceId: invoice.id,
      newValue: { invoiceNumber: invoice.invoiceNumber, vendorInvoiceNo: dto.vendorInvoiceNo, totalAmount: Number(invoice.totalAmount), poNumber: po.poNumber },
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

    // Jurnal + CAS status dalam SATU transaksi:
    //  - akun GL wajib hilang → rollback, status tetap MATCHED (tidak ada dokumen final tanpa jurnal);
    //  - compare-and-set mencegah double-post → jurnal GL ganda saat dua post paralel.
    // Jurnal ditulis SEBELUM CAS supaya kegagalan jurnal tidak menyentuh baris dokumen sama sekali.
    const posted = await withSerializableRetry(
      this.prisma,
      async (tx) => {
        await this.gl.postInvoiceJournal(
          tx,
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

        const cas = await tx.vendorInvoice.updateMany({
          where: { id, status: 'MATCHED' },
          data: { status: 'POSTED', postedAt: new Date(), postedBy: actorId },
        });
        if (cas.count === 0) {
          throw new ConflictException({ code: 'NOT_MATCHED', message: `Hanya MATCHED yang bisa diposting (${invoice.status})` });
        }

        return tx.vendorInvoice.findUniqueOrThrow({ where: { id } });
      },
      { label: 'VendorInvoice.post' },
    );

    await this.audit.record({
      userId: actorId,
      action: 'VendorInvoice.POST',
      resource: 'VendorInvoice',
      resourceId: id,
      newValue: { invoiceNumber: invoice.invoiceNumber, totalAmount: Number(invoice.totalAmount) },
      source: 'api',
    });

    await invalidateAnalytics(this.cache);

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
