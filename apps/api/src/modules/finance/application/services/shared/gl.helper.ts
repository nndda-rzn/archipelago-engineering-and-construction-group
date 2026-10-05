import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '@/modules/foundation';
import { assertPeriodOpen } from '@/shared/utils/period';

type GlTx = Prisma.TransactionClient;

/**
 * Penulis jurnal otomatis.
 *
 * Semua method `post*Journal` menerima `tx` milik pemanggil dan TIDAK membuka transaksi
 * sendiri. Ini wajib supaya perubahan status dokumen dan pembuatan jurnal berada pada
 * satu unit atomik: bila jurnal gagal, status dokumen ikut batal (tidak ada dokumen
 * final tanpa jurnal).
 *
 * Akun wajib yang tidak ditemukan / tidak aktif DIANGGAP kegagalan keras
 * (`GL_ACCOUNT_MISSING`), bukan `null`. Pola lama yang mengembalikan `null` membuat
 * posting "berhasil" tanpa jurnal — tepatnya anomali yang ingin ditutup.
 */
@Injectable()
export class GlHelper {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  async generateJournalNumber(tx: GlTx) {
    const s = await tx.numberSequence.upsert({
      where: { code: 'JRN' },
      update: { nextNumber: { increment: 1 } },
      create: { code: 'JRN', prefix: `JRN-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
    });
    return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
  }

  /**
   * Akun wajib untuk satu sisi jurnal. Filter `isActive` disengaja: akun nonaktif tidak
   * boleh dipakai diam-diam, dan hasilnya diperlakukan sama seperti akun tidak ada.
   */
  private async resolveAccount(tx: GlTx, legalEntityId: string, prefix: string, label: string) {
    const account = await tx.chartOfAccount.findFirst({
      where: { legalEntityId, isActive: true, code: { startsWith: prefix } },
    });
    if (!account) {
      throw new ConflictException({
        code: 'GL_ACCOUNT_MISSING',
        message: `GL account ${label} (code ${prefix}*) not found or inactive for this legal entity`,
      });
    }
    return account;
  }

  /** Akun opsional: bila tidak ada, pajak dibebankan ke akun utama (perilaku lama dipertahankan). */
  private async findOptionalAccount(tx: GlTx, legalEntityId: string, prefix: string) {
    return tx.chartOfAccount.findFirst({
      where: { legalEntityId, isActive: true, code: { startsWith: prefix } },
    });
  }

  async postInvoiceJournal(
    tx: GlTx,
    invoice: { id: string; invoiceNumber: string; legalEntityId: string; totalAmount: number; amount: number; taxAmount: number | null },
    actorId: string,
  ) {
    const apAccount = await this.resolveAccount(tx, invoice.legalEntityId, '210', 'Utang Usaha');
    const expenseAccount = await this.resolveAccount(tx, invoice.legalEntityId, '610', 'Beban/Pembelian');
    const vatAccount = await this.findOptionalAccount(tx, invoice.legalEntityId, '151');

    const amount = Number(invoice.amount);
    const tax = Number(invoice.taxAmount ?? 0);
    const vatLine = tax > 0 && vatAccount
      ? { accountId: vatAccount.id, description: 'PPN Masukan', debit: tax, credit: 0 }
      : { accountId: expenseAccount.id, description: 'PPN Masukan (dibebankan)', debit: tax, credit: 0 };

    // Periode CLOSED/LOCKED → tolak. Dipanggil di dalam tx pemanggil supaya tidak ada
    // celah antara pemeriksaan kunci dan penulisan jurnal.
    const postedAt = new Date();
    await assertPeriodOpen(tx, invoice.legalEntityId, postedAt);

    const seq = await this.generateJournalNumber(tx);
    const journal = await tx.journal.create({
      data: {
        journalNumber: seq,
        legalEntityId: invoice.legalEntityId,
        date: postedAt,
        source: 'INVOICE',
        sourceId: invoice.id,
        reference: invoice.invoiceNumber,
        description: `Invoice ${invoice.invoiceNumber}`,
        status: 'POSTED',
        postedAt,
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
    tx: GlTx,
    payment: { id: string; paymentNumber: string; legalEntityId: string; totalAmount: number },
    actorId: string,
  ) {
    const apAccount = await this.resolveAccount(tx, payment.legalEntityId, '210', 'Utang Usaha');
    const cashAccount = await this.resolveAccount(tx, payment.legalEntityId, '110', 'Kas/Bank');

    const total = Number(payment.totalAmount);

    const postedAt = new Date();
    await assertPeriodOpen(tx, payment.legalEntityId, postedAt);

    const seq = await this.generateJournalNumber(tx);
    const journal = await tx.journal.create({
      data: {
        journalNumber: seq,
        legalEntityId: payment.legalEntityId,
        date: postedAt,
        source: 'PAYMENT',
        sourceId: payment.id,
        reference: payment.paymentNumber,
        description: `Payment ${payment.paymentNumber}`,
        status: 'POSTED',
        postedAt,
        postedBy: actorId,
        lines: {
          create: [
            { accountId: apAccount.id, description: 'Pembayaran utang vendor', debit: total, credit: 0 },
            { accountId: cashAccount.id, description: 'Kas keluar', debit: 0, credit: total },
          ],
        },
      },
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
    tx: GlTx,
    invoice: { id: string; invoiceNumber: string; legalEntityId: string; amount: number; taxAmount: number | null; totalAmount: number },
    actorId: string,
  ) {
    const arAccount = await this.resolveAccount(tx, invoice.legalEntityId, '120', 'Piutang Usaha');
    const revenueAccount = await this.resolveAccount(tx, invoice.legalEntityId, '410', 'Pendapatan');
    const vatOutAccount = await this.findOptionalAccount(tx, invoice.legalEntityId, '220');

    const amount = Number(invoice.amount);
    const tax = Number(invoice.taxAmount ?? 0);
    const vatLine = tax > 0 && vatOutAccount
      ? { accountId: vatOutAccount.id, description: 'PPN Keluaran', debit: 0, credit: tax }
      : { accountId: revenueAccount.id, description: 'PPN Keluaran (termasuk)', debit: 0, credit: tax };

    const postedAt = new Date();
    await assertPeriodOpen(tx, invoice.legalEntityId, postedAt);

    const seq = await this.generateJournalNumber(tx);
    const journal = await tx.journal.create({
      data: {
        journalNumber: seq,
        legalEntityId: invoice.legalEntityId,
        date: postedAt,
        source: 'CLIENT_INVOICE',
        sourceId: invoice.id,
        reference: invoice.invoiceNumber,
        description: `Client Invoice ${invoice.invoiceNumber}`,
        status: 'POSTED',
        postedAt,
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
    tx: GlTx,
    collection: { id: string; collectionNumber: string; legalEntityId: string; totalAmount: number },
    actorId: string,
  ) {
    const cashAccount = await this.resolveAccount(tx, collection.legalEntityId, '110', 'Kas/Bank');
    const arAccount = await this.resolveAccount(tx, collection.legalEntityId, '120', 'Piutang Usaha');

    const total = Number(collection.totalAmount);

    const postedAt = new Date();
    await assertPeriodOpen(tx, collection.legalEntityId, postedAt);

    const seq = await this.generateJournalNumber(tx);
    const journal = await tx.journal.create({
      data: {
        journalNumber: seq,
        legalEntityId: collection.legalEntityId,
        date: postedAt,
        source: 'COLLECTION',
        sourceId: collection.id,
        reference: collection.collectionNumber,
        description: `Collection ${collection.collectionNumber}`,
        status: 'POSTED',
        postedAt,
        postedBy: actorId,
        lines: {
          create: [
            { accountId: cashAccount.id, description: 'Kas masuk dari klien', debit: total, credit: 0 },
            { accountId: arAccount.id, description: 'Pelunasan piutang', debit: 0, credit: total },
          ],
        },
      },
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
