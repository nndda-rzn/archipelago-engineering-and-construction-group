import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { GlHelper } from './shared/gl.helper';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import { withSerializableRetry } from '@/shared/database/serializable-tx';
import { toCents, fromCents } from '@/shared/utils/money';
import type { CreatePaymentDto, ListPaymentQueryDto } from '../../presentation/dto/finance.dto';

/**
 * Status payment yang membuat alokasi AP MENGIKAT saldo invoice (keputusan D1).
 * `DRAFT` sengaja tidak termasuk: draft adalah usulan, belum mengikat.
 * Konsekuensinya penjaga saldo yang menentukan ada di `approvePayment`, bukan hanya di create.
 */
const COMMITTED_AP_STATUSES = ['APPROVED', 'PAID'];

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
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const invoiceIds = dto.items.map((i) => i.invoiceId);
    const invoices = await this.prisma.vendorInvoice.findMany({
      where: { id: { in: invoiceIds } },
    });
    const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

    const paidGroups = await this.prisma.paymentItem.groupBy({
      by: ['invoiceId'],
      where: { invoiceId: { in: invoiceIds }, payment: { status: { in: COMMITTED_AP_STATUSES } } },
      _sum: { amount: true },
    });
    const paidMap = new Map(paidGroups.map((g) => [g.invoiceId, toCents(g._sum.amount)]));

    // Akumulasi per invoice SEBELUM dibandingkan dengan saldo. Memvalidasi baris satu per satu
    // terhadap saldo awal yang sama membuat dua baris invoice yang sama (mis. 80 + 80 pada open
    // 100) sama-sama lolos. Satu baris hasil agregasi juga menjaga PaymentItem tetap satu per invoice.
    const requestedMap = new Map<string, number>();
    for (const item of dto.items) {
      requestedMap.set(item.invoiceId, (requestedMap.get(item.invoiceId) ?? 0) + toCents(item.amount));
    }

    let totalCents = 0;
    const items: Array<{ invoiceId: string; amount: number }> = [];
    for (const [invoiceId, requestedCents] of requestedMap) {
      const invoice = invoiceMap.get(invoiceId);
      if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: `Invoice ${invoiceId} tidak ditemukan` });
      if (invoice.status !== 'POSTED') {
        throw new ConflictException({ code: 'INVOICE_NOT_POSTED', message: `Invoice ${invoice.invoiceNumber} harus POSTED sebelum dibayar` });
      }
      if (invoice.projectId !== dto.projectId) {
        throw new ConflictException({ code: 'INVOICE_PROJECT_MISMATCH', message: 'Invoice bukan milik project ini' });
      }

      // Pemeriksaan di sini bersifat lebih awal (early feedback). Penjaga yang MENGIKAT ada di
      // approvePayment, karena pada tahap DRAFT alokasi belum dihitung sebagai komitmen.
      const openCents = toCents(invoice.totalAmount) - (paidMap.get(invoice.id) ?? 0);
      if (requestedCents > openCents) {
        throw new ConflictException({
          code: 'EXCEED_AP_OPEN',
          message: `Pembayaran melebihi AP open invoice ${invoice.invoiceNumber} (open ${fromCents(openCents)})`,
        });
      }
      totalCents += requestedCents;
      items.push({ invoiceId: invoice.id, amount: fromCents(requestedCents) });
    }
    const totalAmount = fromCents(totalCents);

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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { items: true, project: { select: { id: true } } },
    });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment tidak ditemukan' });
    if (payment.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa di-approve (${payment.status})` });
    }

    // Penjaga AP yang MENGIKAT (keputusan D1): pada tahap DRAFT alokasi belum dihitung sebagai
    // komitmen, sehingga pemeriksaan saldo di create tidak cukup — dua payment DRAFT paralel
    // untuk invoice yang sama masing-masing lolos di sana. Di sini baca saldo dan tulis
    // transisi dalam SATU transaksi Serializable supaya hanya satu yang menang.
    const approved = await withSerializableRetry(
      this.prisma,
      async (tx) => {
        const invoiceIds = payment.items.map((item) => item.invoiceId);

        const invoices = await tx.vendorInvoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, invoiceNumber: true, totalAmount: true, status: true, projectId: true },
        });
        const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

        const committedGroups = await tx.paymentItem.groupBy({
          by: ['invoiceId'],
          where: {
            invoiceId: { in: invoiceIds },
            payment: { status: { in: COMMITTED_AP_STATUSES } },
          },
          _sum: { amount: true },
        });
        const committedMap = new Map(committedGroups.map((g) => [g.invoiceId, toCents(g._sum.amount)]));

        // Kebutuhan dikumpulkan per invoice: satu payment biasanya satu baris per invoice,
        // tetapi agregasi membuat guard ini tetap benar bila bentuknya berubah.
        const requestedMap = new Map<string, number>();
        for (const item of payment.items) {
          requestedMap.set(item.invoiceId, (requestedMap.get(item.invoiceId) ?? 0) + toCents(item.amount));
        }

        for (const [invoiceId, requestedCents] of requestedMap) {
          const invoice = invoiceMap.get(invoiceId);
          if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: `Invoice ${invoiceId} tidak ditemukan` });
          if (invoice.status !== 'POSTED') {
            throw new ConflictException({ code: 'INVOICE_NOT_POSTED', message: `Invoice ${invoice.invoiceNumber} harus POSTED sebelum dibayar` });
          }
          if (invoice.projectId !== payment.projectId) {
            throw new ConflictException({ code: 'INVOICE_PROJECT_MISMATCH', message: 'Invoice bukan milik project ini' });
          }

          const openCents = toCents(invoice.totalAmount) - (committedMap.get(invoiceId) ?? 0);
          if (requestedCents > openCents) {
            throw new ConflictException({
              code: 'EXCEED_AP_OPEN',
              message: `Approval melebihi AP open invoice ${invoice.invoiceNumber} (open ${fromCents(openCents)})`,
            });
          }
        }

        const cas = await tx.payment.updateMany({
          where: { id, status: 'DRAFT' },
          data: { status: 'APPROVED', approvedBy: actorId, approvedAt: new Date() },
        });
        if (cas.count === 0) {
          throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa di-approve (${payment.status})` });
        }

        return tx.payment.findUniqueOrThrow({ where: { id } });
      },
      { label: 'Payment.approve' },
    );

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
          throw new ConflictException({ code: 'NOT_APPROVED', message: `Hanya APPROVED yang bisa dibayar (${payment.status})` });
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