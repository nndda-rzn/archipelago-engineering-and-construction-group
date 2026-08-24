import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreatePaymentDto, CreateVendorInvoiceDto, ListPaymentQueryDto, ListVendorInvoiceQueryDto } from './dto/finance.dto';

// Finance domain — FR-PRO-009 (three-way match: PO + Receipt + Invoice)
@Injectable()
export class FinanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ─── Vendor Invoice (FR-PRO-009) ───────────────────────────────────────────

  async createVendorInvoice(dto: CreateVendorInvoiceDto, actorId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.poId },
      include: { items: true },
    });
    if (!po) throw new NotFoundException({ code: 'PO_NOT_FOUND', message: 'PO tidak ditemukan' });
    if (po.status !== 'RELEASED') {
      throw new ConflictException({ code: 'PO_NOT_RELEASED', message: 'PO harus RELEASED sebelum invoice' });
    }

    // Ambil qty sudah diterima (GR) per PO item — basis three-way match
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

      // Three-way match (per item): qty invoice ≤ qty diterima (PO basis)
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
    const invoice = await this.prisma.vendorInvoice.findUnique({ where: { id }, include: { items: true } });
    if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: 'Invoice tidak ditemukan' });
    if (invoice.status !== 'MATCHED') {
      throw new ConflictException({ code: 'NOT_MATCHED', message: `Hanya MATCHED yang bisa diposting (status: ${invoice.status})` });
    }

    // BR-001: posted transaction immutable — tidak ada edit/delete path

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
        include: {
          items: true,
          project: { select: { code: true, name: true } },
          po: { select: { poNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.vendorInvoice.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── Payment / AP (FR-FIN-005/007) ─────────────────────────────────────────

  async createPayment(dto: CreatePaymentDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    // Validasi invoice POSTED + jumlah tidak melebihi AP open
    let totalAmount = 0;
    const items: Array<{ invoiceId: string; amount: number }> = [];
    for (const item of dto.items) {
      const invoice = await this.prisma.vendorInvoice.findUnique({ where: { id: item.invoiceId } });
      if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: `Invoice ${item.invoiceId} tidak ditemukan` });
      if (invoice.status !== 'POSTED') {
        throw new ConflictException({ code: 'INVOICE_NOT_POSTED', message: `Invoice ${invoice.invoiceNumber} harus POSTED sebelum dibayar` });
      }
      if (invoice.projectId !== dto.projectId) {
        throw new ConflictException({ code: 'INVOICE_PROJECT_MISMATCH', message: 'Invoice bukan milik project ini' });
      }

      // AP open = totalAmount − total paid
      const paidAgg = await this.prisma.paymentItem.aggregate({
        where: { invoiceId: invoice.id, payment: { status: { in: ['APPROVED', 'PAID'] } } },
        _sum: { amount: true },
      });
      const open = Number(invoice.totalAmount) - Number(paidAgg._sum.amount ?? 0);
      if (Number(item.amount) > open + 0.001) {
        throw new ConflictException({
          code: 'EXCEED_AP_OPEN',
          message: `Pembayaran melebihi AP open invoice ${invoice.invoiceNumber} (open ${open})`,
        });
      }
      totalAmount += Number(item.amount);
      items.push({ invoiceId: invoice.id, amount: Number(item.amount) });
    }

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'PAY' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'PAY', prefix: `PAY-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber: seq,
        projectId: dto.projectId,
        vendor: dto.vendor,
        bankAccount: dto.bankAccount ?? null,
        reference: dto.reference ?? null,
        remark: dto.remark ?? null,
        totalAmount,
        items: { create: items },
      },
      include: { items: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Payment.CREATE',
      resource: 'Payment',
      resourceId: payment.id,
      newValue: { paymentNumber: seq, totalAmount: Number(totalAmount), vendor: dto.vendor },
      source: 'api',
    });

    return payment;
  }

  async approvePayment(id: string, actorId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment tidak ditemukan' });
    if (payment.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa di-approve (${payment.status})` });
    }

    const approved = await this.prisma.payment.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: actorId, approvedAt: new Date() },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Payment.APPROVE',
      resource: 'Payment',
      resourceId: id,
      newValue: { paymentNumber: payment.paymentNumber, totalAmount: Number(payment.totalAmount) },
      source: 'api',
    });

    return approved;
  }

  async payPayment(id: string, actorId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment tidak ditemukan' });
    if (payment.status !== 'APPROVED') {
      throw new ConflictException({ code: 'NOT_APPROVED', message: `Hanya APPROVED yang bisa dibayar (${payment.status})` });
    }

    const paid = await this.prisma.payment.update({
      where: { id },
      data: { status: 'PAID', paidBy: actorId, paymentDate: new Date() },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Payment.PAY',
      resource: 'Payment',
      resourceId: id,
      newValue: { paymentNumber: payment.paymentNumber, totalAmount: Number(payment.totalAmount) },
      source: 'api',
    });

    return paid;
  }

  async listPayments(query: ListPaymentQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.PaymentWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          items: { include: { invoice: { select: { invoiceNumber: true, totalAmount: true } } } },
          project: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
