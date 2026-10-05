import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { GlHelper } from './shared/gl.helper';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import { withSerializableRetry } from '@/shared/database/serializable-tx';
import type { CreatePaymentDto, ListPaymentQueryDto } from '../../presentation/dto/finance.dto';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GlHelper) private readonly gl: GlHelper,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async createPayment(dto: CreatePaymentDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const invoiceIds = dto.items.map((i) => i.invoiceId);
    const invoices = await this.prisma.vendorInvoice.findMany({
      where: { id: { in: invoiceIds } },
    });
    const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

    const paidGroups = await this.prisma.paymentItem.groupBy({
      by: ['invoiceId'],
      where: { invoiceId: { in: invoiceIds }, payment: { status: { in: ['APPROVED', 'PAID'] } } },
      _sum: { amount: true },
    });
    const paidMap = new Map(paidGroups.map((g) => [g.invoiceId, Number(g._sum.amount ?? 0)]));

    let totalAmount = 0;
    const items: Array<{ invoiceId: string; amount: number }> = [];
    for (const item of dto.items) {
      const invoice = invoiceMap.get(item.invoiceId);
      if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: `Invoice ${item.invoiceId} not found` });
      if (invoice.status !== 'POSTED') {
        throw new ConflictException({ code: 'INVOICE_NOT_POSTED', message: `Invoice ${invoice.invoiceNumber} must be POSTED before payment` });
      }
      if (invoice.projectId !== dto.projectId) {
        throw new ConflictException({ code: 'INVOICE_PROJECT_MISMATCH', message: 'Invoice does not belong to this project' });
      }

      const open = Number(invoice.totalAmount) - (paidMap.get(invoice.id) ?? 0);
      if (Number(item.amount) > open + 0.001) {
        throw new ConflictException({
          code: 'EXCEED_AP_OPEN',
          message: `Payment exceeds AP outstanding balance for invoice ${invoice.invoiceNumber} (open ${open})`,
        });
      }
      totalAmount += Number(item.amount);
      items.push({ invoiceId: invoice.id, amount: Number(item.amount) });
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'PAY' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'PAY', prefix: `PAY-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;

      return tx.payment.create({
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
    });

    await this.audit.record({
      userId: actorId,
      action: 'Payment.CREATE',
      resource: 'Payment',
      resourceId: payment.id,
      newValue: { paymentNumber: payment.paymentNumber, totalAmount: Number(totalAmount), vendor: dto.vendor },
      source: 'api',
    });

    return payment;
  }

  async approvePayment(id: string, actorId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' });
    if (payment.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Only DRAFT can be approved (${payment.status})` });
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
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' });
    if (payment.status !== 'APPROVED') {
      throw new ConflictException({ code: 'NOT_APPROVED', message: `Only APPROVED can be paid (${payment.status})` });
    }

    // Jurnal + CAS status dalam SATU transaksi: bila jurnal gagal, status tidak berubah;
    // bila status sudah bukan APPROVED (dua pay paralel), jurnal ikut dibatalkan.
    const paid = await withSerializableRetry(
      this.prisma,
      async (tx) => {
        await this.gl.postPaymentJournal(
          tx,
          { id: payment.id, paymentNumber: payment.paymentNumber, legalEntityId: payment.project.legalEntityId, totalAmount: Number(payment.totalAmount) },
          actorId,
        );

        const cas = await tx.payment.updateMany({
          where: { id, status: 'APPROVED' },
          data: { status: 'PAID', paidBy: actorId, paymentDate: new Date() },
        });
        if (cas.count === 0) {
          throw new ConflictException({ code: 'NOT_APPROVED', message: `Only APPROVED can be paid (${payment.status})` });
        }

        return tx.payment.findUniqueOrThrow({ where: { id } });
      },
      { label: 'Payment.pay' },
    );

    await this.audit.record({
      userId: actorId,
      action: 'Payment.PAY',
      resource: 'Payment',
      resourceId: id,
      newValue: { paymentNumber: payment.paymentNumber, totalAmount: Number(payment.totalAmount) },
      source: 'api',
    });

    await invalidateAnalytics(this.cache);

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
        select: {
          id: true,
          paymentNumber: true,
          projectId: true,
          vendor: true,
          bankAccount: true,
          currency: true,
          totalAmount: true,
          status: true,
          paymentDate: true,
          reference: true,
          remark: true,
          createdAt: true,
          items: {
            select: { id: true, invoiceId: true, amount: true, invoice: { select: { invoiceNumber: true, totalAmount: true } } },
          },
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
