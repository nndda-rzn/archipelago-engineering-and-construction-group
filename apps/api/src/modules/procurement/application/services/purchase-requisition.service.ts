import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreatePrDto, ListPrQueryDto } from '../../presentation/dto/procurement.dto';

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createPr(dto: CreatePrDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    if (dto.wbsItemId) {
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
      if (!wbs || wbs.projectId !== dto.projectId) {
        throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS tidak ditemukan di project ini' });
      }
    }

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'PR' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'PR', prefix: `PR-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const pr = await this.prisma.purchaseRequisition.create({
      data: {
        prNumber: seq,
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId ?? null,
        requestedBy: dto.requestedBy,
        description: dto.description ?? null,
        items: {
          create: dto.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit ?? 'EA',
            estimatedUnitPrice: item.estimatedUnitPrice ?? null,
            estimatedTotal: item.estimatedUnitPrice != null ? Number(item.estimatedUnitPrice) * Number(item.quantity) : null,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'PR.CREATE',
      resource: 'PurchaseRequisition',
      resourceId: pr.id,
      newValue: { prNumber: pr.prNumber, projectId: dto.projectId },
      source: 'api',
    });

    return pr;
  }

  async listPr(query: ListPrQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.PurchaseRequisitionWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseRequisition.findMany({
        where,
        include: { items: true, project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchaseRequisition.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}