import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateItpDto, ListItpQueryDto, CreateInspectionDto, InspectDto, ListInspectionQueryDto,
  CreateNcrDto, DisposeNcrDto, ReinspectNcrDto, ListNcrQueryDto,
  CreatePunchItemDto, ClosePunchItemDto, ListPunchItemQueryDto,
} from '../../presentation/dto/quality.dto';

@Injectable()
export class QualityService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-QA-001: ITP terkait work package
  async createItp(dto: CreateItpDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'ITP' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'ITP', prefix: `ITP-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const itp = await this.prisma.itp.create({
      data: {
        itpNumber: seq,
        projectId: dto.projectId ?? null,
        workPackageId: dto.workPackageId ?? null,
        title: dto.title,
        description: dto.description ?? null,
      },
      include: { workPackage: { select: { wpNumber: true, title: true } } },
    });

    await this.audit.record({ userId: actorId, action: 'Itp.CREATE', resource: 'Itp', resourceId: itp.id, newValue: { itpNumber: seq, title: dto.title }, source: 'api' });
    return itp;
  }

  async listItps(query: ListItpQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.ItpWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.itp.findMany({ where, include: { workPackage: { select: { wpNumber: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.itp.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-QA-002: inspection request — status + result
  async createInspection(dto: CreateInspectionDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'INS' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'INS', prefix: `INS-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const ins = await this.prisma.inspectionRequest.create({
      data: {
        inspectionNumber: seq,
        projectId: dto.projectId ?? null,
        workPackageId: dto.workPackageId ?? null,
        itpId: dto.itpId ?? null,
        description: dto.description,
      },
      include: { workPackage: { select: { wpNumber: true, title: true } } },
    });

    await this.audit.record({ userId: actorId, action: 'InspectionRequest.CREATE', resource: 'InspectionRequest', resourceId: ins.id, newValue: { inspectionNumber: seq }, source: 'api' });
    return ins;
  }

  async inspect(id: string, dto: InspectDto, actorId: string) {
    const ins = await this.prisma.inspectionRequest.findUnique({ where: { id } });
    if (!ins) throw new NotFoundException({ code: 'INSPECTION_NOT_FOUND', message: 'Inspection tidak ditemukan' });
    if (ins.status === 'CLOSED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: 'Inspection sudah closed' });
    }
    if (!['PASS', 'FAIL'].includes(dto.result)) {
      throw new BadRequestException({ code: 'INVALID_RESULT', message: 'Result harus PASS atau FAIL' });
    }
    const updated = await this.prisma.inspectionRequest.update({
      where: { id },
      data: { result: dto.result, status: 'CLOSED', inspectedAt: new Date(), inspectedBy: actorId },
    });
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

  // FR-QA-003: NCR — category, severity, root cause, corrective action, reinspection
  async createNcr(dto: CreateNcrDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'NCR' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'NCR', prefix: `NCR-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const ncr = await this.prisma.ncr.create({
      data: {
        ncrNumber: seq,
        projectId: dto.projectId ?? null,
        workPackageId: dto.workPackageId ?? null,
        category: dto.category ?? 'WORKMANSHIP',
        severity: dto.severity ?? 'MINOR',
        description: dto.description,
        reinspectionRequired: dto.reinspectionRequired ?? true,
      },
      include: { workPackage: { select: { wpNumber: true, title: true } } },
    });

    await this.audit.record({ userId: actorId, action: 'Ncr.CREATE', resource: 'Ncr', resourceId: ncr.id, newValue: { ncrNumber: seq, severity: ncr.severity, category: ncr.category }, source: 'api' });
    return ncr;
  }

  async disposeNcr(id: string, dto: DisposeNcrDto, actorId: string) {
    const ncr = await this.prisma.ncr.findUnique({ where: { id } });
    if (!ncr) throw new NotFoundException({ code: 'NCR_NOT_FOUND', message: 'NCR tidak ditemukan' });
    if (ncr.status !== 'OPEN') {
      throw new ConflictException({ code: 'NOT_OPEN', message: `Hanya OPEN yang bisa di-dispose (${ncr.status})` });
    }
    const updated = await this.prisma.ncr.update({
      where: { id },
      data: { status: 'UNDER_REVIEW', rootCause: dto.rootCause ?? ncr.rootCause, correctiveAction: dto.correctiveAction ?? ncr.correctiveAction },
    });
    await this.audit.record({ userId: actorId, action: 'Ncr.DISPOSE', resource: 'Ncr', resourceId: id, newValue: { ncrNumber: ncr.ncrNumber }, source: 'api' });
    return updated;
  }

  async reinspectNcr(id: string, dto: ReinspectNcrDto, actorId: string) {
    const ncr = await this.prisma.ncr.findUnique({ where: { id } });
    if (!ncr) throw new NotFoundException({ code: 'NCR_NOT_FOUND', message: 'NCR tidak ditemukan' });
    if (ncr.status === 'CLOSED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: 'NCR sudah closed' });
    }
    if (!['PASS', 'FAIL'].includes(dto.result)) {
      throw new BadRequestException({ code: 'INVALID_RESULT', message: 'Result harus PASS atau FAIL' });
    }
    const updated = await this.prisma.ncr.update({
      where: { id },
      data: {
        reinspectionResult: dto.result,
        status: dto.result === 'PASS' ? 'CLOSED' : 'UNDER_REVIEW',
        closedAt: dto.result === 'PASS' ? new Date() : null,
      },
    });
    await this.audit.record({ userId: actorId, action: 'Ncr.REINSPECT', resource: 'Ncr', resourceId: id, newValue: { result: dto.result, status: updated.status }, source: 'api' });
    return updated;
  }

  async listNcrs(query: ListNcrQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.NcrWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ncr.findMany({ where, include: { workPackage: { select: { wpNumber: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.ncr.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-QA-004: punch list — ditutup sebelum handover gate
  async createPunchItem(dto: CreatePunchItemDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'PUN' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'PUN', prefix: `PUN-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const item = await this.prisma.punchListItem.create({
      data: {
        punchNumber: seq,
        projectId: dto.projectId ?? null,
        workPackageId: dto.workPackageId ?? null,
        handoverPackageId: dto.handoverPackageId ?? null,
        description: dto.description,
      },
    });

    await this.audit.record({ userId: actorId, action: 'PunchListItem.CREATE', resource: 'PunchListItem', resourceId: item.id, newValue: { punchNumber: seq }, source: 'api' });
    return item;
  }

  async closePunchItem(id: string, dto: ClosePunchItemDto, actorId: string) {
    const item = await this.prisma.punchListItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException({ code: 'PUNCH_NOT_FOUND', message: 'Punch item tidak ditemukan' });
    if (item.status === 'CLOSED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: 'Punch item sudah closed' });
    }
    const updated = await this.prisma.punchListItem.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date(), closedBy: actorId },
    });
    await this.audit.record({ userId: actorId, action: 'PunchListItem.CLOSE', resource: 'PunchListItem', resourceId: id, newValue: { punchNumber: item.punchNumber }, source: 'api' });
    return updated;
  }

  async listPunchItems(query: ListPunchItemQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.PunchListItemWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.punchListItem.findMany({ where, include: { workPackage: { select: { wpNumber: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.punchListItem.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
