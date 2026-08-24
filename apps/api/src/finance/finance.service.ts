import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreateChartOfAccountDto, CreateClientInvoiceDto, CreateJournalDto, CreatePaymentDto, CreateProgressClaimDto, CreateVendorInvoiceDto, ListChartOfAccountQueryDto, ListClientInvoiceQueryDto, ListJournalQueryDto, ListPaymentQueryDto, ListProgressClaimQueryDto, ListVendorInvoiceQueryDto, CertifyClaimDto } from './dto/finance.dto';

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
    const invoice = await this.prisma.vendorInvoice.findUnique({ where: { id }, include: { items: true, project: { select: { legalEntityId: true } } } });
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

    // Auto-post GL journal (FR-FIN-003/004) — Debit Expense/PPN, Credit AP
    await this.postInvoiceJournal(
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

    // Auto-post GL journal (FR-FIN-003/004) — Debit AP, Credit Kas/Bank
    await this.postPaymentJournal(
      {
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        legalEntityId: payment.project.legalEntityId,
        totalAmount: Number(payment.totalAmount),
      },
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

  // ─── GL: Chart of Accounts (FR-FIN-002) ────────────────────────────────────

  async createChartOfAccount(dto: CreateChartOfAccountDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const existing = await this.prisma.chartOfAccount.findUnique({
      where: { legalEntityId_code: { legalEntityId: dto.legalEntityId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException({ code: 'ACCOUNT_CODE_EXISTS', message: `Kode akun ${dto.code} sudah ada` });
    }

    if (dto.parentId) {
      const parent = await this.prisma.chartOfAccount.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException({ code: 'PARENT_ACCOUNT_NOT_FOUND', message: 'Akun parent tidak ditemukan' });
      if (parent.legalEntityId !== dto.legalEntityId) {
        throw new ConflictException({ code: 'ACCOUNT_ENTITY_MISMATCH', message: 'Parent akun beda legal entity' });
      }
    }

    const account = await this.prisma.chartOfAccount.create({
      data: {
        legalEntityId: dto.legalEntityId,
        code: dto.code,
        name: dto.name,
        accountType: dto.accountType ?? 'ASSET',
        normalBalance: dto.normalBalance ?? 'DEBIT',
        parentId: dto.parentId ?? null,
        description: dto.description ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ChartOfAccount.CREATE',
      resource: 'ChartOfAccount',
      resourceId: account.id,
      newValue: { code: dto.code, name: dto.name, accountType: account.accountType },
      source: 'api',
    });

    return account;
  }

  async listChartOfAccounts(query: ListChartOfAccountQueryDto) {
    const where: Prisma.ChartOfAccountWhereInput = {};
    if (query.legalEntityId) {
      const entity = await this.prisma.legalEntity.findUnique({ where: { id: query.legalEntityId } });
      if (entity) where.legalEntityId = query.legalEntityId;
    }
    return this.prisma.chartOfAccount.findMany({
      where,
      include: { parent: { select: { code: true, name: true } } },
      orderBy: [{ code: 'asc' }],
    });
  }

  // ─── GL: Trial Balance (FR-FIN-001) ────────────────────────────────────────

  async trialBalance(legalEntityId: string, from?: string, to?: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const where: Prisma.JournalLineWhereInput = {
      journal: { legalEntityId, status: 'POSTED' },
      ...(from || to ? { journal: { legalEntityId, status: 'POSTED', date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } } : {}),
    };

    const rows = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where,
      _sum: { debit: true, credit: true },
    });

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: rows.map((r) => r.accountId) } },
      select: { id: true, code: true, name: true, accountType: true, normalBalance: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    let totalDebit = 0;
    let totalCredit = 0;
    const lines = rows
      .map((row) => {
        const account = accountMap.get(row.accountId);
        if (!account) return null;
        const debit = Number(row._sum.debit ?? 0);
        const credit = Number(row._sum.credit ?? 0);
        const balance = debit - credit;
        totalDebit += debit;
        totalCredit += credit;
        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          normalBalance: account.normalBalance,
          debit,
          credit,
          balance,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .sort((a, b) => a.code.localeCompare(b.code));

    return {
      legalEntityId,
      legalEntityCode: entity.code,
      generatedAt: new Date().toISOString(),
      from: from ?? null,
      to: to ?? null,
      totalDebit,
      totalCredit,
      balanced: Math.abs(totalDebit - totalCredit) < 0.001,
      lines,
    };
  }

  // ─── GL: Journal (FR-FIN-003/004) ──────────────────────────────────────────

  private async generateJournalNumber(tx: Prisma.TransactionClient) {
    const s = await tx.numberSequence.upsert({
      where: { code: 'JRN' },
      update: { nextNumber: { increment: 1 } },
      create: { code: 'JRN', prefix: `JRN-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
    });
    return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
  }

  async createJournal(dto: CreateJournalDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    let totalDebit = 0;
    let totalCredit = 0;
    const lines: Array<{ accountId: string; description: string | null; debit: number; credit: number; projectId: string | null; wbsItemId: string | null }> = [];

    for (const line of dto.lines) {
      const account = await this.prisma.chartOfAccount.findUnique({ where: { id: line.accountId } });
      if (!account) throw new NotFoundException({ code: 'ACCOUNT_NOT_FOUND', message: `Akun ${line.accountId} tidak ditemukan` });
      if (!account.isActive) throw new ConflictException({ code: 'ACCOUNT_INACTIVE', message: `Akun ${account.code} tidak aktif` });
      if (account.legalEntityId !== dto.legalEntityId) {
        throw new ConflictException({ code: 'ACCOUNT_ENTITY_MISMATCH', message: `Akun ${account.code} beda legal entity` });
      }
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      if (debit > 0 && credit > 0) {
        throw new ConflictException({ code: 'LINE_BOTH_SIDES', message: 'Satu line tidak boleh debit dan credit sekaligus' });
      }
      if (debit === 0 && credit === 0) {
        throw new ConflictException({ code: 'LINE_ZERO', message: 'Line harus punya debit atau credit' });
      }
      totalDebit += debit;
      totalCredit += credit;
      lines.push({
        accountId: account.id,
        description: line.description ?? null,
        debit,
        credit,
        projectId: line.projectId ?? null,
        wbsItemId: line.wbsItemId ?? null,
      });
    }

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new ConflictException({
        code: 'UNBALANCED_JOURNAL',
        message: `Journal tidak balance: debit ${totalDebit} vs credit ${totalCredit}`,
      });
    }

    const journal = await this.prisma.$transaction(async (tx) => {
      const seq = await this.generateJournalNumber(tx);
      return tx.journal.create({
        data: {
          journalNumber: seq,
          legalEntityId: dto.legalEntityId,
          date: dto.date ? new Date(dto.date) : new Date(),
          source: 'MANUAL',
          reference: dto.reference ?? null,
          description: dto.description,
          lines: { create: lines },
        },
        include: { lines: { include: { account: { select: { code: true, name: true } } } } },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Journal.CREATE',
      resource: 'Journal',
      resourceId: journal.id,
      newValue: { journalNumber: journal.journalNumber, totalDebit, totalCredit, description: dto.description },
      source: 'api',
    });

    return journal;
  }

  async postJournal(id: string, actorId: string) {
    const journal = await this.prisma.journal.findUnique({ where: { id }, include: { lines: true } });
    if (!journal) throw new NotFoundException({ code: 'JOURNAL_NOT_FOUND', message: 'Journal tidak ditemukan' });
    if (journal.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${journal.status})` });
    }

    const totalDebit = journal.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = journal.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new ConflictException({
        code: 'UNBALANCED_JOURNAL',
        message: `Journal tidak balance: debit ${totalDebit} vs credit ${totalCredit}`,
      });
    }

    const posted = await this.prisma.journal.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date(), postedBy: actorId },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Journal.POST',
      resource: 'Journal',
      resourceId: id,
      newValue: { journalNumber: journal.journalNumber, totalDebit, totalCredit },
      source: 'api',
    });

    return posted;
  }

  async listJournals(query: ListJournalQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.JournalWhereInput = {
      ...(query.legalEntityId ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.journal.findMany({
        where,
        include: {
          legalEntity: { select: { code: true } },
          lines: {
            include: { account: { select: { code: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.journal.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // Auto-post: invoice POSTED → Debit Expense, Debit PPN Masukan, Credit AP (balanced)
  private async postInvoiceJournal(invoice: { id: string; invoiceNumber: string; legalEntityId: string; totalAmount: number; amount: number; taxAmount: number | null }, actorId: string) {
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

  // Auto-post: payment PAID → Debit AP, Credit Kas/Bank (balanced)
  private async postPaymentJournal(payment: { id: string; paymentNumber: string; legalEntityId: string; totalAmount: number }, actorId: string) {
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

  // ─── AR: Progress Claim + Client Invoice (FR-FIN-008/009) ──────────────────

  async createProgressClaim(dto: CreateProgressClaimDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'CLM' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'CLM', prefix: `CLM-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const claim = await this.prisma.progressClaim.create({
      data: {
        claimNumber: seq,
        projectId: dto.projectId,
        claimDate: dto.claimDate ? new Date(dto.claimDate) : new Date(),
        period: dto.period ?? null,
        description: dto.description ?? null,
        amount: Number(dto.amount),
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ProgressClaim.CREATE',
      resource: 'ProgressClaim',
      resourceId: claim.id,
      newValue: { claimNumber: seq, amount: Number(dto.amount), projectId: dto.projectId },
      source: 'api',
    });

    return claim;
  }

  async certifyClaim(id: string, dto: CertifyClaimDto, actorId: string) {
    const claim = await this.prisma.progressClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException({ code: 'CLAIM_NOT_FOUND', message: 'Claim tidak ditemukan' });
    if (claim.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa disertifikasi (${claim.status})` });
    }

    const certified = await this.prisma.progressClaim.update({
      where: { id },
      data: {
        status: 'CERTIFIED',
        certifiedAmount: Number(dto.certifiedAmount),
        certifiedBy: actorId,
        certifiedAt: new Date(),
        remark: dto.remark ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ProgressClaim.CERTIFY',
      resource: 'ProgressClaim',
      resourceId: id,
      newValue: { claimNumber: claim.claimNumber, certifiedAmount: Number(dto.certifiedAmount) },
      source: 'api',
    });

    return certified;
  }

  async listProgressClaims(query: ListProgressClaimQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ProgressClaimWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.progressClaim.findMany({
        where,
        include: { project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.progressClaim.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createClientInvoice(dto: CreateClientInvoiceDto, actorId: string) {
    const claim = await this.prisma.progressClaim.findUnique({
      where: { id: dto.claimId },
      include: { project: { select: { legalEntityId: true, client: true } } },
    });
    if (!claim) throw new NotFoundException({ code: 'CLAIM_NOT_FOUND', message: 'Claim tidak ditemukan' });
    if (claim.status !== 'CERTIFIED') {
      throw new ConflictException({ code: 'CLAIM_NOT_CERTIFIED', message: 'Hanya claim CERTIFIED yang bisa di-invoice' });
    }

    const existing = await this.prisma.clientInvoice.findUnique({ where: { claimId: claim.id } });
    if (existing) throw new ConflictException({ code: 'CLAIM_ALREADY_INVOICED', message: 'Claim sudah punya client invoice' });

    const amount = Number(claim.certifiedAmount ?? claim.amount);
    const tax = Number(dto.taxAmount ?? 0);
    const total = amount + tax;

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'CINV' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'CINV', prefix: `CINV-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const invoice = await this.prisma.clientInvoice.create({
      data: {
        invoiceNumber: seq,
        projectId: claim.projectId,
        claimId: claim.id,
        client: claim.project.client,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
        amount,
        taxAmount: tax > 0 ? tax : null,
        totalAmount: total,
        remark: dto.remark ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ClientInvoice.CREATE',
      resource: 'ClientInvoice',
      resourceId: invoice.id,
      newValue: { invoiceNumber: seq, amount, taxAmount: tax, totalAmount: total, claimNumber: claim.claimNumber },
      source: 'api',
    });

    return invoice;
  }

  // Auto-post: client invoice POSTED → Debit Piutang (1200), Credit Pendapatan (4100) + PPN Keluaran (2200)
  private async postClientInvoiceJournal(invoice: { id: string; invoiceNumber: string; legalEntityId: string; amount: number; taxAmount: number | null; totalAmount: number }, actorId: string) {
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

  async postClientInvoice(id: string, actorId: string) {
    const invoice = await this.prisma.clientInvoice.findUnique({
      where: { id },
      include: { project: { select: { legalEntityId: true } } },
    });
    if (!invoice) throw new NotFoundException({ code: 'CLIENT_INVOICE_NOT_FOUND', message: 'Client invoice tidak ditemukan' });
    if (invoice.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${invoice.status})` });
    }

    const posted = await this.prisma.clientInvoice.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date(), postedBy: actorId },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ClientInvoice.POST',
      resource: 'ClientInvoice',
      resourceId: id,
      newValue: { invoiceNumber: invoice.invoiceNumber, totalAmount: Number(invoice.totalAmount) },
      source: 'api',
    });

    await this.postClientInvoiceJournal(
      {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        legalEntityId: invoice.project.legalEntityId,
        amount: Number(invoice.amount),
        taxAmount: invoice.taxAmount != null ? Number(invoice.taxAmount) : null,
        totalAmount: Number(invoice.totalAmount),
      },
      actorId,
    );

    return posted;
  }

  async listClientInvoices(query: ListClientInvoiceQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ClientInvoiceWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.clientInvoice.findMany({
        where,
        include: {
          project: { select: { code: true, name: true } },
          claim: { select: { claimNumber: true, period: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.clientInvoice.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
