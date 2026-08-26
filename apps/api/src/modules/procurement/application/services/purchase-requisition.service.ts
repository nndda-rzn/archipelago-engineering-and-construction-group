import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

  // FR-PRO-002: budget availability check — estimated total ≤ remaining budget (published − commitment − PR lain)
  private async budgetCheck(projectId: string, estimatedTotal: number) {
    const [budgetAgg, poAgg, subconAgg, prAgg] = await Promise.all([
      this.prisma.budgetItem.aggregate({ where: { projectId, status: 'PUBLISHED' }, _sum: { amount: true } }),
      this.prisma.purchaseOrder.aggregate({ where: { projectId, status: 'RELEASED' }, _sum: { totalAmount: true } }),
      this.prisma.subcontract.aggregate({ where: { projectId, status: 'ACTIVE' }, _sum: { contractValue: true } }),
      this.prisma.purchaseRequisition.aggregate({ where: { projectId, status: { not: 'CANCELLED' } }, _sum: { estimatedTotal: true } }),
    ]);

    const budget = Number(budgetAgg._sum?.amount ?? 0);
    const commitment = Number(poAgg._sum?.totalAmount ?? 0) + Number(subconAgg._sum?.contractValue ?? 0);
    const existingPr = Number(prAgg._sum?.estimatedTotal ?? 0);
    const remaining = budget - commitment - existingPr;

    return { budget, commitment, existingPr, remaining, within: remaining >= estimatedTotal - 0.001 };
  }

  async createPr(dto: CreatePrDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    if (dto.wbsItemId) {
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
      if (!wbs || wbs.projectId !== dto.projectId) {
        throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS tidak ditemukan di project ini' });
      }
    }

    const estimatedTotal = dto.items.reduce((sum, item) => sum + (Number(item.estimatedUnitPrice ?? 0) * Number(item.quantity)), 0);
    const check = await this.budgetCheck(dto.projectId, estimatedTotal);
    if (!check.within) {
      throw new ConflictException({
        code: 'BUDGET_EXCEEDED',
        message: `Estimasi PR ${estimatedTotal.toLocaleString('id-ID')} melebihi sisa budget ${check.remaining.toLocaleString('id-ID')} (FR-PRO-002)`,
      });
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
        estimatedTotal,
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
      newValue: { prNumber: pr.prNumber, projectId: dto.projectId, estimatedTotal, budgetRemaining: check.remaining },
      source: 'api',
    });

    return pr;
  }

  // FR-PRO-002: status budget project — untuk UI + traceability
  async budgetStatus(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });
    const check = await this.budgetCheck(projectId, 0);
    return { projectId, ...check, generatedAt: new Date().toISOString() };
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