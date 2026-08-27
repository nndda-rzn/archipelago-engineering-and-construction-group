import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';

@Injectable()
export class GlHelper {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async generateJournalNumber(tx: Prisma.TransactionClient) {
    const s = await tx.numberSequence.upsert({
      where: { code: 'JRN' },
      update: { nextNumber: { increment: 1 } },
      create: { code: 'JRN', prefix: `JRN-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
    });
    return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
  }

  async postInvoiceJournal(
    invoice: { id: string; invoiceNumber: string; legalEntityId: string; totalAmount: number; amount: number; taxAmount: number | null },
    actorId: string,
  ) {
    const apAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: invoice.legalEntityId, code: { startsWith: '210' } },
    });
    const expenseAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: invoice.legalEntityId, code: { startsWith: '610' } },
    });
    const vatAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: invoice.legalEntityId, code: { startsWith: '151' } },
    });
    if (!apAccount || !expenseAccount) return null;

    const amount = Number(invoice.amount);
    const tax = Number(invoice.taxAmount ?? 0);
    const vatLine = tax > 0 && vatAccount
      ? { accountId: vatAccount.id, description: 'PPN Masukan', debit: tax, credit: 0 }
      : { accountId: expenseAccount.id, description: 'PPN Masukan (dibebankan)', debit: tax, credit: 0 };

    const journal = await this.prisma.$transaction(async (tx) => {
      const seq = await this.generateJournalNumber(tx);
      return tx.journal.create({
        data: {
          journalNumber: seq,
          legalEntityId: invoice.legalEntityId,
          date: new Date(),
          source: 'INVOICE',
          sourceId: invoice.id,
          reference: invoice.invoiceNumber,
          description: `Invoice ${invoice.invoiceNumber}`,
          status: 'POSTED',
          postedAt: new Date(),
          postedBy: actorId,
          lines: {
            create: [
              { accountId: expenseAccount.id, description: 'Pembelian material', debit: amount, credit: 0 },
              ...(tax > 0 ? [vatLine] : []),
              { accountId: apAccount.id, description: 'Utang ke vendor', debit: 0, credit: amount + tax },
            ],
          },
        },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Journal.AUTO_POST',
      resource: 'Journal',
      resourceId: journal.id,
      newValue: { journalNumber: journal.journalNumber, source: 'INVOICE', reference: invoice.invoiceNumber },
      source: 'api',
    });

    return journal;
  }

  async postPaymentJournal(
    payment: { id: string; paymentNumber: string; legalEntityId: string; totalAmount: number },
    actorId: string,
  ) {
    const apAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: payment.legalEntityId, code: { startsWith: '210' } },
    });
    const cashAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: payment.legalEntityId, code: { startsWith: '110' } },
    });
    if (!apAccount || !cashAccount) return null;

    const total = Number(payment.totalAmount);

    const journal = await this.prisma.$transaction(async (tx) => {
      const seq = await this.generateJournalNumber(tx);
      return tx.journal.create({
        data: {
          journalNumber: seq,
          legalEntityId: payment.legalEntityId,
          date: new Date(),
          source: 'PAYMENT',
          sourceId: payment.id,
          reference: payment.paymentNumber,
          description: `Payment ${payment.paymentNumber}`,
          status: 'POSTED',
          postedAt: new Date(),
          postedBy: actorId,
          lines: {
            create: [
              { accountId: apAccount.id, description: 'Pembayaran utang vendor', debit: total, credit: 0 },
              { accountId: cashAccount.id, description: 'Kas keluar', debit: 0, credit: total },
            ],
          },
        },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Journal.AUTO_POST',
      resource: 'Journal',
      resourceId: journal.id,
      newValue: { journalNumber: journal.journalNumber, source: 'PAYMENT', reference: payment.paymentNumber },
      source: 'api',
    });

    return journal;
  }

  async postClientInvoiceJournal(
    invoice: { id: string; invoiceNumber: string; legalEntityId: string; amount: number; taxAmount: number | null; totalAmount: number },
    actorId: string,
  ) {
    const arAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: invoice.legalEntityId, code: { startsWith: '120' } },
    });
    const revenueAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: invoice.legalEntityId, code: { startsWith: '410' } },
    });
    const vatOutAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: invoice.legalEntityId, code: { startsWith: '220' } },
    });
    if (!arAccount || !revenueAccount) return null;

    const amount = Number(invoice.amount);
    const tax = Number(invoice.taxAmount ?? 0);
    const vatLine = tax > 0 && vatOutAccount
      ? { accountId: vatOutAccount.id, description: 'PPN Keluaran', debit: 0, credit: tax }
      : { accountId: revenueAccount.id, description: 'PPN Keluaran (termasuk)', debit: 0, credit: tax };

    const journal = await this.prisma.$transaction(async (tx) => {
      const seq = await this.generateJournalNumber(tx);
      return tx.journal.create({
        data: {
          journalNumber: seq,
          legalEntityId: invoice.legalEntityId,
          date: new Date(),
          source: 'CLIENT_INVOICE',
          sourceId: invoice.id,
          reference: invoice.invoiceNumber,
          description: `Client Invoice ${invoice.invoiceNumber}`,
          status: 'POSTED',
          postedAt: new Date(),
          postedBy: actorId,
          lines: {
            create: [
              { accountId: arAccount.id, description: 'Piutang ke klien', debit: amount + tax, credit: 0 },
              { accountId: revenueAccount.id, description: 'Pendapatan progres', debit: 0, credit: amount },
              ...(tax > 0 ? [vatLine] : []),
            ],
          },
        },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Journal.AUTO_POST',
      resource: 'Journal',
      resourceId: journal.id,
      newValue: { journalNumber: journal.journalNumber, source: 'CLIENT_INVOICE', reference: invoice.invoiceNumber },
      source: 'api',
    });

    return journal;
  }

  async postCollectionJournal(
    collection: { id: string; collectionNumber: string; legalEntityId: string; totalAmount: number },
    actorId: string,
  ) {
    const cashAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: collection.legalEntityId, code: { startsWith: '110' } },
    });
    const arAccount = await this.prisma.chartOfAccount.findFirst({
      where: { legalEntityId: collection.legalEntityId, code: { startsWith: '120' } },
    });
    if (!cashAccount || !arAccount) return null;

    const total = Number(collection.totalAmount);

    const journal = await this.prisma.$transaction(async (tx) => {
      const seq = await this.generateJournalNumber(tx);
      return tx.journal.create({
        data: {
          journalNumber: seq,
          legalEntityId: collection.legalEntityId,
          date: new Date(),
          source: 'COLLECTION',
          sourceId: collection.id,
          reference: collection.collectionNumber,
          description: `Collection ${collection.collectionNumber}`,
          status: 'POSTED',
          postedAt: new Date(),
          postedBy: actorId,
          lines: {
            create: [
              { accountId: cashAccount.id, description: 'Kas masuk dari klien', debit: total, credit: 0 },
              { accountId: arAccount.id, description: 'Pelunasan piutang', debit: 0, credit: total },
            ],
          },
        },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Journal.AUTO_POST',
      resource: 'Journal',
      resourceId: journal.id,
      newValue: { journalNumber: journal.journalNumber, source: 'COLLECTION', reference: collection.collectionNumber },
      source: 'api',
    });

    return journal;
  }
}