import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateBankGuaranteeDto, ListBankGuaranteeQueryDto } from '../../presentation/dto/treasury.dto';

@Injectable()
export class BankGuaranteeService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createBankGuarantee(dto: CreateBankGuaranteeDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const guaranteeNumber = await this.seq.next('BG', `BG-${new Date().getFullYear()}-`);

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
}
