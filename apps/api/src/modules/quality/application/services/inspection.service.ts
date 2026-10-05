import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateInspectionDto, InspectDto, ListInspectionQueryDto } from '../../presentation/dto/quality.dto';

@Injectable()
export class InspectionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createInspection(dto: CreateInspectionDto, actorId: string) {
    const ins = await this.prisma.$transaction(async (tx) => {
      const inspectionNumber = await this.seq.next('INS', `INS-${new Date().getFullYear()}-`, tx);
      return tx.inspectionRequest.create({
        data: {
          inspectionNumber,
          projectId: dto.projectId ?? null,
          workPackageId: dto.workPackageId ?? null,
          itpId: dto.itpId ?? null,
          description: dto.description,
        },
        include: { workPackage: { select: { wpNumber: true, title: true } } },
      });
    });
    await this.audit.record({ userId: actorId, action: 'InspectionRequest.CREATE', resource: 'InspectionRequest', resourceId: ins.id, newValue: { inspectionNumber: ins.inspectionNumber }, source: 'api' });
    return ins;
  }

  async inspect(id: string, dto: InspectDto, actorId: string) {
    const ins = await this.prisma.inspectionRequest.findUnique({ where: { id } });
    if (!ins) throw new NotFoundException({ code: 'INSPECTION_NOT_FOUND', message: 'Inspection not found' });
    if (ins.status === 'CLOSED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: 'Inspection is already closed' });
    }
    if (!['PASS', 'FAIL'].includes(dto.result)) {
      throw new BadRequestException({ code: 'INVALID_RESULT', message: 'Result must be PASS or FAIL' });
    }
    const updated = await this.prisma.inspectionRequest.update({ where: { id }, data: { result: dto.result, status: 'CLOSED', inspectedAt: new Date(), inspectedBy: actorId } });
    await this.audit.record({ userId: actorId, action: 'InspectionRequest.INSPECT', resource: 'InspectionRequest', resourceId: id, newValue: { result: dto.result }, source: 'api' });
    return updated;
  }

  async listInspections(query: ListInspectionQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.InspectionRequestWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.result ? { result: query.result } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.inspectionRequest.findMany({ where, include: { workPackage: { select: { wpNumber: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.inspectionRequest.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
