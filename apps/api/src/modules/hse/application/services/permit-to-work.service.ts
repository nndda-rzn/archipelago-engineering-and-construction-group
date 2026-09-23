import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreatePermitDto, ListPermitQueryDto } from '../../presentation/dto/hse.dto';

@Injectable()
export class PermitToWorkService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createPermit(dto: CreatePermitDto, actorId: string) {
    if (dto.validFrom && dto.validTo && new Date(dto.validTo) <= new Date(dto.validFrom)) {
      throw new BadRequestException({ code: 'INVALID_PERIOD', message: 'validTo harus setelah validFrom' });
    }
    const permit = await this.prisma.$transaction(async (tx) => {
      const permitNumber = await this.seq.next('PTW', `PTW-${new Date().getFullYear()}-`, tx);
      return tx.permitToWork.create({
        data: {
          permitNumber,
          projectId: dto.projectId ?? null,
          area: dto.area,
          description: dto.description ?? null,
          validFrom: new Date(dto.validFrom),
          validTo: new Date(dto.validTo),
          issuedTo: dto.issuedTo,
        },
        include: { project: { select: { code: true, name: true } } },
      });
    });
    await this.audit.record({ userId: actorId, action: 'PermitToWork.CREATE', resource: 'PermitToWork', resourceId: permit.id, newValue: { permitNumber: permit.permitNumber, area: dto.area }, source: 'api' });
    return permit;
  }

  async revokePermit(id: string, actorId: string) {
    const permit = await this.prisma.permitToWork.findUnique({ where: { id } });
    if (!permit) throw new NotFoundException({ code: 'PERMIT_NOT_FOUND', message: 'Permit tidak ditemukan' });
    if (permit.status !== 'ACTIVE') {
      throw new ConflictException({ code: 'NOT_ACTIVE', message: `Hanya ACTIVE yang bisa dicabut (${permit.status})` });
    }
    const revoked = await this.prisma.permitToWork.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedBy: actorId } });
    await this.audit.record({ userId: actorId, action: 'PermitToWork.REVOKE', resource: 'PermitToWork', resourceId: id, newValue: { permitNumber: permit.permitNumber }, source: 'api' });
    return revoked;
  }

  async listPermits(query: ListPermitQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.PermitToWorkWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.permitToWork.findMany({ where, include: { project: { select: { code: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.permitToWork.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
