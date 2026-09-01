import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateBankAccountDto, ListBankAccountQueryDto } from '../../presentation/dto/treasury.dto';

@Injectable()
export class BankAccountService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  // FR-TRY-001: Bank Account + Cash Position
  async createBankAccount(dto: CreateBankAccountDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const accountCode = await this.seq.next('BANK', `BANK-${new Date().getFullYear()}-`);

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
        outflow,
        currentBalance: Math.round((opening - outflow) * 100) / 100,
      };
    });

    const totalBalance = items.reduce((s, i) => s + i.currentBalance, 0);
    return { items, totalBalance: Math.round(totalBalance * 100) / 100, generatedAt: new Date().toISOString() };
  }
}
