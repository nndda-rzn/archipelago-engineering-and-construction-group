import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { GlHelper } from './shared/gl.helper';
import type { CreatePaymentDto, ListPaymentQueryDto } from '../dto/finance.dto';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GlHelper) private readonly gl: GlHelper,
  ) {}

  async createPayment(dto: CreatePaymentDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { project: { select: { legalEntityId: true } } },
    });
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

    await this.gl.postPaymentJournal(
      { id: payment.id, paymentNumber: payment.paymentNumber, legalEntityId: payment.project.legalEntityId, totalAmount: Number(payment.totalAmount) },
      actorId,
    );

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