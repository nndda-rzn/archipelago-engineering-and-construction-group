import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreateChartOfAccountDto, ListChartOfAccountQueryDto } from '../dto/finance.dto';

@Injectable()
export class ChartOfAccountService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createChartOfAccount(dto: CreateChartOfAccountDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const existing = await this.prisma.chartOfAccount.findUnique({
      where: { legalEntityId_code: { legalEntityId: dto.legalEntityId, code: dto.code } },
    });
    if (existing) throw new ConflictException({ code: 'ACCOUNT_CODE_EXISTS', message: `Kode akun ${dto.code} sudah ada` });

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
}