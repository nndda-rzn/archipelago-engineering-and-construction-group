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

  /**
   * Ringkasan komersial untuk header command-center `/commercial`:
   * pipeline (opp OPEN), win rate (closed won vs lost), contract book
   * (executed vs draft), dan funnel per stage — satu round-trip.
   */
  async getSummary() {
    const [opps, won, lost, contracts, clientCount] = await Promise.all([
      this.prisma.opportunity.findMany({ where: { status: 'OPEN' }, select: { stage: true, expectedValue: true } }),
      this.prisma.opportunity.aggregate({ where: { status: 'CLOSED_WON' }, _sum: { expectedValue: true }, _count: { _all: true } }),
      this.prisma.opportunity.aggregate({ where: { status: 'CLOSED_LOST' }, _sum: { expectedValue: true }, _count: { _all: true } }),
      this.prisma.contract.findMany({ where: { status: { in: ['DRAFT', 'EXECUTED'] } }, select: { status: true, value: true } }),
      this.prisma.client.count(),
    ]);

    const stages = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];
    const funnel = stages.map((stage) => {
      const items = opps.filter((o) => o.stage === stage);
      return { stage, count: items.length, value: items.reduce((s, o) => s + Number(o.expectedValue), 0) };
    });

    const wonCount = won._count._all;
    const lostCount = lost._count._all;
    const winRatePct = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 1000) / 10 : null;

    const executed = contracts.filter((c) => c.status === 'EXECUTED');
    const draft = contracts.filter((c) => c.status === 'DRAFT');

    return {
      pipelineValue: opps.reduce((s, o) => s + Number(o.expectedValue), 0),
      openOpportunities: opps.length,
      wonValue: Number(won._sum.expectedValue ?? 0),
      lostValue: Number(lost._sum.expectedValue ?? 0),
      winRatePct,
      contractBook: {
        executedValue: executed.reduce((s, c) => s + Number(c.value), 0),
        executedCount: executed.length,
        draftValue: draft.reduce((s, c) => s + Number(c.value), 0),
        draftCount: draft.length,
      },
      clients: { total: clientCount },
      funnel,
    };
  }

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
    if (!client) throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', message: 'Client not found' });

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
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' });
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
      if (!client) throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', message: 'Client not found' });
    }
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
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
    if (!contract) throw new NotFoundException({ code: 'CONTRACT_NOT_FOUND', message: 'Contract not found' });
    if (contract.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Only DRAFT can be executed (${contract.status})` });
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
