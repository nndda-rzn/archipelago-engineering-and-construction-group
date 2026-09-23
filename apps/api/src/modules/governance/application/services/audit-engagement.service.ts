import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateAuditDto, CreateFindingDto, ListAuditQueryDto, RespondFindingDto } from '../../presentation/dto/governance.dto';

@Injectable()
export class AuditEngagementService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createAudit(dto: CreateAuditDto, actorId: string) {
    const auditRecord = await this.prisma.$transaction(async (tx) => {
      const auditNumber = await this.seq.next('AUD', `AUD-${new Date().getFullYear()}-`, tx);
      return tx.auditEngagement.create({
        data: { auditNumber, title: dto.title, scope: dto.scope ?? null, plannedAt: new Date(), auditor: actorId },
      });
    });
    await this.audit.record({ userId: actorId, action: 'AuditEngagement.CREATE', resource: 'AuditEngagement', resourceId: auditRecord.id, newValue: { auditNumber: auditRecord.auditNumber, title: dto.title }, source: 'api' });
    return auditRecord;
  }

  async advanceAudit(id: string, dto: { status?: string }, actorId: string) {
    const auditRecord = await this.prisma.auditEngagement.findUnique({ where: { id } });
    if (!auditRecord) throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit tidak ditemukan' });
    const status = dto.status ?? 'FIELDWORK';
    if (!['PLANNED', 'FIELDWORK', 'FINDINGS', 'CLOSED'].includes(status)) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Status audit tidak valid' });
    }
    const updated = await this.prisma.auditEngagement.update({
      where: { id },
      data: { status, completedAt: status === 'CLOSED' ? new Date() : null },
    });
    await this.audit.record({ userId: actorId, action: 'AuditEngagement.STATUS', resource: 'AuditEngagement', resourceId: id, newValue: { auditNumber: auditRecord.auditNumber, status }, source: 'api' });
    return updated;
  }

  async createFinding(auditId: string, dto: CreateFindingDto, actorId: string) {
    const auditRecord = await this.prisma.auditEngagement.findUnique({ where: { id: auditId } });
    if (!auditRecord) throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit tidak ditemukan' });
    const finding = await this.prisma.auditFinding.create({
      data: { auditId, title: dto.title, severity: dto.severity ?? 'MEDIUM', followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null },
    });
    await this.audit.record({ userId: actorId, action: 'AuditFinding.CREATE', resource: 'AuditFinding', resourceId: finding.id, newValue: { auditId, title: dto.title }, source: 'api' });
    return finding;
  }

  async respondFinding(findingId: string, dto: RespondFindingDto, actorId: string) {
    const finding = await this.prisma.auditFinding.findUnique({ where: { id: findingId } });
    if (!finding) throw new NotFoundException({ code: 'FINDING_NOT_FOUND', message: 'Finding tidak ditemukan' });
    if (finding.status === 'VERIFIED') {
      throw new ConflictException({ code: 'ALREADY_VERIFIED', message: 'Finding sudah verified' });
    }
    const status = dto.status === 'VERIFIED' ? 'VERIFIED' : dto.response ? 'ACCEPTED' : finding.status;
    const updated = await this.prisma.auditFinding.update({
      where: { id: findingId },
      data: { response: dto.response ?? finding.response, correctiveAction: dto.correctiveAction ?? finding.correctiveAction, status },
    });
    await this.audit.record({ userId: actorId, action: 'AuditFinding.RESPOND', resource: 'AuditFinding', resourceId: findingId, newValue: { status }, source: 'api' });
    return updated;
  }

  async listAudits(query: ListAuditQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.AuditEngagementWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditEngagement.findMany({ where, include: { findings: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.auditEngagement.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
