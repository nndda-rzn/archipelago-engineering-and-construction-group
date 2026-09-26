import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateContractAmendmentDto } from '../../presentation/dto/tender.dto';

@Injectable()
export class ContractAmendmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createContractAmendment(contractId: string, dto: CreateContractAmendmentDto, actorId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException({ code: 'CONTRACT_NOT_FOUND', message: 'Contract not found' });
    if (contract.status !== 'EXECUTED' && contract.status !== 'AMENDED') {
      throw new ConflictException({ code: 'NOT_EXECUTED', message: 'Amendments are only allowed for EXECUTED contracts' });
    }

    const amendment = await this.prisma.$transaction(async (tx) => {
      const amendmentNumber = await this.seq.next('AMD', `AMD-${new Date().getFullYear()}-`, tx);
      return tx.contractAmendment.create({
        data: {
          amendmentNumber,
          contractId,
          title: dto.title,
          description: dto.description ?? null,
          amountChange: dto.amountChange,
          signedDate: dto.signedDate ? new Date(dto.signedDate) : null,
        },
      });
    });

    await this.audit.record({ userId: actorId, action: 'ContractAmendment.CREATE', resource: 'ContractAmendment', resourceId: amendment.id, newValue: { amendmentNumber: amendment.amendmentNumber, contractNumber: contract.contractNumber, amountChange: Number(dto.amountChange) }, source: 'api' });
    return amendment;
  }

  async executeAmendment(id: string, actorId: string) {
    const amendment = await this.prisma.contractAmendment.findUnique({ where: { id }, include: { contract: true } });
    if (!amendment) throw new NotFoundException({ code: 'AMENDMENT_NOT_FOUND', message: 'Amendment not found' });
    if (amendment.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa dieksekusi (${amendment.status})` });
    }

    const [executed, updatedContract] = await this.prisma.$transaction([
      this.prisma.contractAmendment.update({ where: { id }, data: { status: 'EXECUTED', signedDate: new Date() } }),
      this.prisma.contract.update({
        where: { id: amendment.contractId },
        data: { value: { increment: amendment.amountChange }, status: 'AMENDED' },
      }),
    ]);

    await this.audit.record({ userId: actorId, action: 'ContractAmendment.EXECUTE', resource: 'ContractAmendment', resourceId: id, newValue: { amendmentNumber: amendment.amendmentNumber, amountChange: Number(amendment.amountChange), contractValueAfter: Number(updatedContract.value) }, source: 'api' });
    return { executed, contractValueAfter: Number(updatedContract.value) };
  }

  async listAmendments(contractId: string) {
    const items = await this.prisma.contractAmendment.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
    return { items, total: items.length };
  }
}
