import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreatePaymentProposalDto, ListPaymentProposalQueryDto } from '../../presentation/dto/treasury.dto';

@Injectable()
export class PaymentProposalService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  // FR-TRY-002: Payment Proposal lifecycle DRAFT→SUBMITTED→APPROVED→RELEASED
  async createPaymentProposal(dto: CreatePaymentProposalDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    if (dto.bankAccountId) {
      const bank = await this.prisma.bankAccount.findUnique({ where: { id: dto.bankAccountId } });
      if (!bank) throw new NotFoundException({ code: 'BANK_NOT_FOUND', message: 'Rekening tidak ditemukan' });
    }

    const proposalNumber = await this.seq.next('PP', `PP-${new Date().getFullYear()}-`);

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
}
