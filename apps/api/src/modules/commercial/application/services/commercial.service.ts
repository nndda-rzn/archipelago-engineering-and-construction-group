import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateClientDto, ListClientQueryDto, CreateOpportunityDto, ListOpportunityQueryDto, UpdateOpportunityStageDto,
  CreateContractDto, ListContractQueryDto, ExecuteContractDto,
} from '../../presentation/dto/commercial.dto';

@Injectable()
export class CommercialService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createClient(dto: CreateClientDto, actorId: string) {
    const client = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'CLT' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'CLT', prefix: `CLT-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.client.create({
        data: {
          clientCode: seq,
          name: dto.name,
          industry: dto.industry ?? null,
          contactPerson: dto.contactPerson ?? null,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          country: dto.country ?? 'ID',
        },
      });
    });

    await this.audit.record({ userId: actorId, action: 'Client.CREATE', resource: 'Client', resourceId: client.id, newValue: { clientCode: client.clientCode, name: dto.name }, source: 'api' });
    return client;
  }

  async listClients(query: ListClientQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.ClientWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.client.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createOpportunity(dto: CreateOpportunityDto, actorId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', message: 'Client tidak ditemukan' });

    const opp = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'OPP' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'OPP', prefix: `OPP-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.opportunity.create({
        data: {
          oppNumber: seq,
          clientId: dto.clientId,
          title: dto.title,
          stage: dto.stage ?? 'LEAD',
          probability: dto.probability ?? 10,
          expectedValue: Number(dto.expectedValue),
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          owner: dto.owner,
          currency: dto.currency ?? 'IDR',
        },
        include: { client: { select: { name: true } } },
      });
    });

    await this.audit.record({ userId: actorId, action: 'Opportunity.CREATE', resource: 'Opportunity', resourceId: opp.id, newValue: { oppNumber: opp.oppNumber, title: dto.title, expectedValue: Number(dto.expectedValue) }, source: 'api' });
    return opp;
  }

  async updateOpportunityStage(id: string, dto: UpdateOpportunityStageDto, actorId: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id } });
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity tidak ditemukan' });
    const stage = dto.stage ?? opp.stage;
    const status = stage === 'WON' ? 'CLOSED_WON' : stage === 'LOST' ? 'CLOSED_LOST' : 'OPEN';
    const probability = dto.probability ?? opp.probability;

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: { stage, probability, status },
    });

    await this.audit.record({ userId: actorId, action: 'Opportunity.STAGE', resource: 'Opportunity', resourceId: id, newValue: { oppNumber: opp.oppNumber, stage, probability }, source: 'api' });
    return updated;
  }

  async listOpportunities(query: ListOpportunityQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.OpportunityWhereInput = {
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({ where, include: { client: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.opportunity.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createContract(dto: CreateContractDto, actorId: string) {
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client) throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', message: 'Client tidak ditemukan' });
    }
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });
    }

    const contract = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'CTR' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'CTR', prefix: `CTR-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.contract.create({
        data: {
          contractNumber: seq,
          projectId: dto.projectId ?? null,
          clientId: dto.clientId ?? '',
          opportunityId: dto.opportunityId ?? null,
          contractType: dto.contractType ?? 'LUMP_SUM',
          title: dto.title,
          value: Number(dto.value),
          advanceTerm: dto.advanceTerm ?? 0,
          retentionTerm: dto.retentionTerm ?? 0,
          signedDate: dto.signedDate ? new Date(dto.signedDate) : null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
        include: { client: { select: { name: true } }, project: { select: { code: true } } },
      });
    });

    await this.audit.record({ userId: actorId, action: 'Contract.CREATE', resource: 'Contract', resourceId: contract.id, newValue: { contractNumber: contract.contractNumber, title: dto.title, value: Number(dto.value) }, source: 'api' });
    return contract;
  }

  async executeContract(id: string, dto: ExecuteContractDto, actorId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException({ code: 'CONTRACT_NOT_FOUND', message: 'Kontrak tidak ditemukan' });
    if (contract.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa dieksekusi (${contract.status})` });
    }
    const executed = await this.prisma.contract.update({
      where: { id },
      data: { status: 'EXECUTED', signedDate: dto.signedDate ? new Date(dto.signedDate) : new Date() },
    });
    await this.audit.record({ userId: actorId, action: 'Contract.EXECUTE', resource: 'Contract', resourceId: id, newValue: { contractNumber: contract.contractNumber, status: 'EXECUTED' }, source: 'api' });
    return executed;
  }

  async listContracts(query: ListContractQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.ContractWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({ where, include: { client: { select: { name: true } }, project: { select: { code: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.contract.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
