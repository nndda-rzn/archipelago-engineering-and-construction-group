import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateHandoverDto, ListHandoverQueryDto } from '../../presentation/dto/commissioning.dto';

@Injectable()
export class HandoverService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async findAll(projectId: string, query: ListHandoverQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.HandoverPackageWhereInput = {
      projectId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.handoverPackage.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.handoverPackage.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async create(projectId: string, dto: CreateHandoverDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const items = dto.items ?? [];
    const ho = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'HO' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'HO', prefix: `HO-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.handoverPackage.create({
        data: {
          hoNumber: seq,
          projectId,
          title: dto.title,
          handoverDate: dto.handoverDate ? new Date(dto.handoverDate) : null,
          checklist: dto.checklist ?? null,
          note: dto.note ?? null,
          items: {
            create: items.map((i) => ({
              documentName: i.documentName,
              isMandatory: i.isMandatory ?? true,
            })),
          },
        },
        include: { items: true },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Handover.CREATE',
      resource: 'HandoverPackage',
      resourceId: ho.id,
      newValue: { hoNumber: ho.hoNumber, projectId, items: items.length },
      source: 'api',
    });

    return ho;
  }

  async approve(id: string, actorId: string) {
    const ho = await this.prisma.handoverPackage.findUnique({ where: { id }, include: { items: true } });
    if (!ho) throw new NotFoundException({ code: 'HO_NOT_FOUND', message: 'Handover tidak ditemukan' });
    if (ho.status !== 'SUBMITTED') {
      throw new ConflictException({ code: 'HO_NOT_SUBMITTED', message: `Handover harus SUBMITTED sebelum approve (${ho.status})` });
    }

    const allVerified = ho.items.every((i) => i.status === 'VERIFIED');
    if (!allVerified) {
      throw new ConflictException({ code: 'HO_ITEMS_PENDING', message: 'Semua item dokumen harus VERIFIED sebelum approve' });
    }

    const updated = await this.prisma.handoverPackage.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: actorId, approvedAt: new Date() },
      include: { items: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Handover.APPROVE',
      resource: 'HandoverPackage',
      resourceId: id,
      newValue: { hoNumber: ho.hoNumber },
      source: 'api',
    });

    return updated;
  }

  async verifyItem(handoverId: string, itemId: string, actorId: string) {
    const item = await this.prisma.handoverItem.findFirst({ where: { id: itemId, handoverId } });
    if (!item) throw new NotFoundException({ code: 'HO_ITEM_NOT_FOUND', message: 'Item handover tidak ditemukan' });

    return this.prisma.handoverItem.update({
      where: { id: itemId },
      data: { status: 'VERIFIED', verifiedBy: actorId, verifiedAt: new Date() },
    });
  }

  async submit(id: string) {
    const ho = await this.prisma.handoverPackage.findUnique({ where: { id } });
    if (!ho) throw new NotFoundException({ code: 'HO_NOT_FOUND', message: 'Handover tidak ditemukan' });
    if (ho.status !== 'DRAFT') {
      throw new ConflictException({ code: 'HO_NOT_DRAFT', message: `Hanya DRAFT yang bisa di-submit (${ho.status})` });
    }
    return this.prisma.handoverPackage.update({ where: { id }, data: { status: 'SUBMITTED' } });
  }
}
