import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateLegalCaseDto, ListLegalCaseQueryDto } from '../../presentation/dto/governance.dto';

@Injectable()
export class LegalCaseService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  // FR-GOV-003: legal case
  async createLegalCase(dto: CreateLegalCaseDto, actorId: string) {
    const caseNumber = await this.seq.next('LGL', `LGL-${new Date().getFullYear()}-`);
    const legalCase = await this.prisma.legalCase.create({
      data: {
        caseNumber,
        projectId: dto.projectId ?? null,
        legalEntityId: dto.legalEntityId ?? null,
        title: dto.title,
        caseType: dto.caseType ?? 'CONTRACT',
        counterpart: dto.counterpart ?? null,
        description: dto.description ?? null,
      },
      include: { project: { select: { code: true } } },
    });
    await this.audit.record({ userId: actorId, action: 'LegalCase.CREATE', resource: 'LegalCase', resourceId: legalCase.id, newValue: { caseNumber, title: dto.title, caseType: legalCase.caseType }, source: 'api' });
    return legalCase;
  }

  async updateLegalCaseStatus(id: string, dto: { status?: string }, actorId: string) {
    const legalCase = await this.prisma.legalCase.findUnique({ where: { id } });
    if (!legalCase) throw new NotFoundException({ code: 'LEGAL_CASE_NOT_FOUND', message: 'Legal case tidak ditemukan' });
    const status = dto.status ?? legalCase.status;
    if (!['OPEN', 'IN_PROGRESS', 'WON', 'LOST', 'SETTLED'].includes(status)) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Status legal case tidak valid' });
    }
    const updated = await this.prisma.legalCase.update({ where: { id }, data: { status } });
    await this.audit.record({ userId: actorId, action: 'LegalCase.STATUS', resource: 'LegalCase', resourceId: id, newValue: { caseNumber: legalCase.caseNumber, status }, source: 'api' });
    return updated;
  }

  async listLegalCases(query: ListLegalCaseQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.LegalCaseWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.legalCase.findMany({ where, include: { project: { select: { code: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.legalCase.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
