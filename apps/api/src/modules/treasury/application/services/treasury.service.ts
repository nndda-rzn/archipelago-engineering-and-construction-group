import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateBankAccountDto, CreateBankGuaranteeDto, CreateCashForecastDto, CreateFxExposureDto,
  CreatePaymentProposalDto, ListBankAccountQueryDto, ListBankGuaranteeQueryDto,
  ListPaymentProposalQueryDto,
} from '../../presentation/dto/treasury.dto';

@Injectable()
export class TreasuryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async nextNumber(code: string, prefix: string): Promise<string> {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code },
        update: { nextNumber: { increment: 1 } },
        create: { code, prefix, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });
    return seq;
  }

  // ─── FR-TRY-001: Bank Account + Cash Position ───────────────────────────────

  async createBankAccount(dto: CreateBankAccountDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const accountCode = await this.nextNumber('BANK', `BANK-${new Date().getFullYear()}-`);

    const account = await this.prisma.bankAccount.create({
      data: {
        accountCode,
        legalEntityId: dto.legalEntityId,
        bankCode: dto.bankCode,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        currency: dto.currency ?? 'IDR',
        openingBalance: dto.openingBalance ?? 0,
      },
    });

    await this.audit.record({ userId: actorId, action: 'BankAccount.CREATE', resource: 'BankAccount', resourceId: account.id, newValue: { accountCode, bankName: dto.bankName, accountNumber: dto.accountNumber }, source: 'api' });
    return account;
  }

  async listBankAccounts(query: ListBankAccountQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.BankAccountWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.bankAccount.findMany({
        where,
        include: { legalEntity: { select: { code: true, legalName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bankAccount.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // Cash position: opening balance + net payment proposal (RELEASED) per bank
  async cashPosition() {
    const accounts = await this.prisma.bankAccount.findMany({
      include: { legalEntity: { select: { code: true } } },
    });

    const released = await this.prisma.paymentProposal.groupBy({
      by: ['bankAccountId'],
      where: { status: 'RELEASED' },
      _sum: { totalAmount: true },
    });
    const outflowByBank = new Map(released.map((r) => [r.bankAccountId, Number(r._sum?.totalAmount ?? 0)]));

    const items = accounts.map((a) => {
      const opening = Number(a.openingBalance);
      const outflow = outflowByBank.get(a.id) ?? 0;
      return {
        bankAccountId: a.id,
        accountCode: a.accountCode,
        bankName: a.bankName,
        accountNumber: a.accountNumber,
        currency: a.currency,
        legalEntityCode: a.legalEntity.code,
        openingBalance: opening,
        outflow: outflow,
        currentBalance: Math.round((opening - outflow) * 100) / 100,
      };
    });

    const totalBalance = items.reduce((s, i) => s + i.currentBalance, 0);
    return {
      items,
      totalBalance: Math.round(totalBalance * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── FR-TRY-002: Payment Proposal ───────────────────────────────────────────

  async createPaymentProposal(dto: CreatePaymentProposalDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    if (dto.bankAccountId) {
      const bank = await this.prisma.bankAccount.findUnique({ where: { id: dto.bankAccountId } });
      if (!bank) throw new NotFoundException({ code: 'BANK_NOT_FOUND', message: 'Rekening tidak ditemukan' });
    }

    const proposalNumber = await this.nextNumber('PP', `PP-${new Date().getFullYear()}-`);

    const proposal = await this.prisma.paymentProposal.create({
      data: {
        proposalNumber,
        legalEntityId: dto.legalEntityId,
        bankAccountId: dto.bankAccountId ?? null,
        vendor: dto.vendor,
        currency: dto.currency ?? 'IDR',
        totalAmount: dto.totalAmount,
        invoiceIds: dto.invoiceIds ?? [],
        remark: dto.remark ?? null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'PaymentProposal.CREATE', resource: 'PaymentProposal', resourceId: proposal.id, newValue: { proposalNumber, vendor: dto.vendor, totalAmount: Number(dto.totalAmount) }, source: 'api' });
    return proposal;
  }

  async listPaymentProposals(query: ListPaymentProposalQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.PaymentProposalWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentProposal.findMany({
        where,
        include: { legalEntity: { select: { code: true } }, bankAccount: { select: { accountCode: true, bankName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.paymentProposal.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async submitProposal(id: string, actorId: string) {
    const proposal = await this.prisma.paymentProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException({ code: 'PROPOSAL_NOT_FOUND', message: 'Proposal tidak ditemukan' });
    if (proposal.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa disubmit (${proposal.status})` });
    }
    const updated = await this.prisma.paymentProposal.update({ where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
    await this.audit.record({ userId: actorId, action: 'PaymentProposal.SUBMIT', resource: 'PaymentProposal', resourceId: id, newValue: { proposalNumber: proposal.proposalNumber }, source: 'api' });
    return updated;
  }

  async approveProposal(id: string, actorId: string) {
    const proposal = await this.prisma.paymentProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException({ code: 'PROPOSAL_NOT_FOUND', message: 'Proposal tidak ditemukan' });
    if (proposal.status !== 'SUBMITTED') {
      throw new ConflictException({ code: 'NOT_SUBMITTED', message: `Hanya SUBMITTED yang bisa di-approve (${proposal.status})` });
    }
    const updated = await this.prisma.paymentProposal.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: actorId } });
    await this.audit.record({ userId: actorId, action: 'PaymentProposal.APPROVE', resource: 'PaymentProposal', resourceId: id, newValue: { proposalNumber: proposal.proposalNumber }, source: 'api' });
    return updated;
  }

  async releaseProposal(id: string, actorId: string) {
    const proposal = await this.prisma.paymentProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException({ code: 'PROPOSAL_NOT_FOUND', message: 'Proposal tidak ditemukan' });
    if (proposal.status !== 'APPROVED') {
      throw new ConflictException({ code: 'NOT_APPROVED', message: `Hanya APPROVED yang bisa di-release (${proposal.status})` });
    }
    const updated = await this.prisma.paymentProposal.update({ where: { id }, data: { status: 'RELEASED' } });
    await this.audit.record({ userId: actorId, action: 'PaymentProposal.RELEASE', resource: 'PaymentProposal', resourceId: id, newValue: { proposalNumber: proposal.proposalNumber }, source: 'api' });
    return updated;
  }

  // ─── FR-TRY-003: Bank Guarantee ─────────────────────────────────────────────

  async createBankGuarantee(dto: CreateBankGuaranteeDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const guaranteeNumber = await this.nextNumber('BG', `BG-${new Date().getFullYear()}-`);

    const bg = await this.prisma.bankGuarantee.create({
      data: {
        guaranteeNumber,
        legalEntityId: dto.legalEntityId,
        projectId: dto.projectId ?? null,
        guaranteeType: dto.guaranteeType ?? 'BID',
        beneficiary: dto.beneficiary,
        bankName: dto.bankName,
        amount: dto.amount,
        currency: dto.currency ?? 'IDR',
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'BankGuarantee.CREATE', resource: 'BankGuarantee', resourceId: bg.id, newValue: { guaranteeNumber, guaranteeType: dto.guaranteeType ?? 'BID', amount: Number(dto.amount) }, source: 'api' });
    return bg;
  }

  async listBankGuarantees(query: ListBankGuaranteeQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.BankGuaranteeWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.guaranteeType ? { guaranteeType: query.guaranteeType } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.bankGuarantee.findMany({
        where,
        include: { legalEntity: { select: { code: true } }, project: { select: { code: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bankGuarantee.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── FR-TRY-004: Cash Forecast ──────────────────────────────────────────────

  async createCashForecast(dto: CreateCashForecastDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const receipt = dto.expectedReceipt ?? 0;
    const ap = dto.expectedAp ?? 0;
    const payroll = dto.expectedPayroll ?? 0;
    const loan = dto.expectedLoan ?? 0;
    const tax = dto.expectedTax ?? 0;
    const projectCf = dto.projectCashFlow ?? 0;
    const net = receipt + loan - ap - payroll - tax + projectCf;

    const forecastCode = await this.nextNumber('CF', `CF-${new Date().getFullYear()}-`);

    const forecast = await this.prisma.cashForecast.create({
      data: {
        forecastCode,
        legalEntityId: dto.legalEntityId,
        period: dto.period,
        expectedReceipt: receipt,
        expectedAp: ap,
        expectedPayroll: payroll,
        expectedLoan: loan,
        expectedTax: tax,
        projectCashFlow: projectCf,
        netForecast: Math.round(net * 100) / 100,
      },
    });

    await this.audit.record({ userId: actorId, action: 'CashForecast.CREATE', resource: 'CashForecast', resourceId: forecast.id, newValue: { forecastCode, period: dto.period, net: Math.round(net * 100) / 100 }, source: 'api' });
    return forecast;
  }

  async listCashForecasts() {
    const items = await this.prisma.cashForecast.findMany({
      include: { legalEntity: { select: { code: true } } },
      orderBy: { period: 'desc' },
    });
    return { items, total: items.length };
  }

  // ─── FR-TRY-005: FX Exposure ────────────────────────────────────────────────

  async createFxExposure(dto: CreateFxExposureDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const existing = await this.prisma.fxExposure.findUnique({ where: { legalEntityId_currency: { legalEntityId: dto.legalEntityId, currency: dto.currency } } });
    if (existing) throw new ConflictException({ code: 'FX_EXPOSURE_EXISTS', message: `Eksposur ${dto.currency} sudah ada — update via upsert` });

    const fx = await this.prisma.fxExposure.create({
      data: {
        legalEntityId: dto.legalEntityId,
        currency: dto.currency,
        exposureAmount: dto.exposureAmount,
        rate: dto.rate ?? 1,
        baseCurrency: dto.baseCurrency ?? 'IDR',
      },
    });

    await this.audit.record({ userId: actorId, action: 'FxExposure.CREATE', resource: 'FxExposure', resourceId: fx.id, newValue: { currency: dto.currency, exposureAmount: Number(dto.exposureAmount) }, source: 'api' });
    return fx;
  }

  async listFxExposures() {
    const items = await this.prisma.fxExposure.findMany({
      include: { legalEntity: { select: { code: true } } },
      orderBy: { currency: 'asc' },
    });
    return { items, total: items.length };
  }
}
