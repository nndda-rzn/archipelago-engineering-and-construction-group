import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { withSerializableRetry } from '@/shared/database/serializable-tx';
import type { CreatePrDto, ListPrQueryDto } from '../../presentation/dto/procurement.dto';

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /**
   * Hitung sisa budget. Bisa dijalankan pada `this.prisma` (read-only) atau pada `tx`
   * (di dalam transaksi Serializable saat validasi sebelum tulis).
   *
   * PR yang sudah memiliki PO RELEASED TIDAK dihitung lagi di `existingPr`: nilainya sudah
   * masuk `commitment` lewat PO. Tanpa pengecualian ini, PR-terkonversi + PO-nya dihitung
   * dua kali sehingga `remaining` terlalu kecil (false BUDGET_EXCEEDED).
   */
  private async budgetCheck(
    projectId: string,
    estimatedTotal: number,
    client: Pick<Prisma.TransactionClient, 'budgetItem' | 'purchaseOrder' | 'subcontract' | 'purchaseRequisition'> = this.prisma,
  ) {
    const [budgetAgg, poAgg, subconAgg, prAgg] = await Promise.all([
      client.budgetItem.aggregate({ where: { projectId, status: 'PUBLISHED' }, _sum: { amount: true } }),
      client.purchaseOrder.aggregate({ where: { projectId, status: 'RELEASED' }, _sum: { totalAmount: true } }),
      client.subcontract.aggregate({ where: { projectId, status: 'ACTIVE' }, _sum: { contractValue: true } }),
      client.purchaseRequisition.aggregate({
        where: {
          projectId,
          status: { not: 'CANCELLED' },
          purchaseOrders: { none: { status: 'RELEASED' } },
        },
        _sum: { estimatedTotal: true },
      }),
    ]);

    const budget = Number(budgetAgg._sum?.amount ?? 0);
    const commitment = Number(poAgg._sum?.totalAmount ?? 0) + Number(subconAgg._sum?.contractValue ?? 0);
    const existingPr = Number(prAgg._sum?.estimatedTotal ?? 0);
    const remaining = budget - commitment - existingPr;

    return { budget, commitment, existingPr, remaining, within: remaining >= estimatedTotal - 0.001 };
  }

  async createPr(dto: CreatePrDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    if (dto.wbsItemId) {
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
      if (!wbs || wbs.projectId !== dto.projectId) {
        throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS not found in this project' });
      }
    }

    const estimatedTotal = dto.items.reduce((sum, item) => sum + (Number(item.estimatedUnitPrice ?? 0) * Number(item.quantity)), 0);

    // Cek budget + tulis dalam SATU transaksi Serializable: menutup TOCTOU — dua PR paralel
    // tidak bisa sama-sama lolos cek budget yang sama (budget overcommit).
    const pr = await withSerializableRetry(
      this.prisma,
      async (tx) => {
        const check = await this.budgetCheck(dto.projectId, estimatedTotal, tx);
        if (!check.within) {
          throw new ConflictException({
            code: 'BUDGET_EXCEEDED',
            message: `PR estimate ${estimatedTotal.toLocaleString('id-ID')} exceeds the remaining budget ${check.remaining.toLocaleString('id-ID')} (FR-PRO-002)`,
          });
        }

        const s = await tx.numberSequence.upsert({
          where: { code: 'PR' },
          update: { nextNumber: { increment: 1 } },
          create: { code: 'PR', prefix: `PR-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
        });
        const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
        const created = await tx.purchaseRequisition.create({
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
        return { pr: created, budgetRemaining: check.remaining };
      },
      { label: 'PurchaseRequisition.create' },
    );

    await this.audit.record({
      userId: actorId,
      action: 'PR.CREATE',
      resource: 'PurchaseRequisition',
      resourceId: pr.pr.id,
      newValue: { prNumber: pr.pr.prNumber, projectId: dto.projectId, estimatedTotal, budgetRemaining: pr.budgetRemaining },
      source: 'api',
    });

    return pr.pr;
  }

  async budgetStatus(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
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