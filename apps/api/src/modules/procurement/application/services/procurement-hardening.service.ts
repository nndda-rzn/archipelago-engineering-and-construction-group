import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreatePoChangeDto, CreateVendorRatingDto, ListRatingQueryDto } from '../../presentation/dto/procurement-hardening.dto';

@Injectable()
export class ProcurementHardeningService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async nextNumber(code: string, prefix: string): Promise<string> {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code },
        update: { nextNumber: { increment: 1 } },
        create: { code, prefix, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });
    return seq;
  }

  async createPoChange(poId: string, dto: CreatePoChangeDto, actorId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) throw new NotFoundException({ code: 'PO_NOT_FOUND', message: 'PO tidak ditemukan' });
    if (po.status === 'CANCELLED') {
      throw new ConflictException({ code: 'PO_CANCELLED', message: 'PO dibatalkan — tidak bisa diubah' });
    }

    const changeNumber = await this.nextNumber('POC', `POC-${new Date().getFullYear()}-`);

    const change = await this.prisma.purchaseOrderChange.create({
      data: {
        changeNumber,
        purchaseOrderId: poId,
        version: po.version,
        previousTotal: po.totalAmount,
        newTotal: dto.newTotal,
        reason: dto.reason,
        createdBy: actorId,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'PoChange.CREATE',
      resource: 'PurchaseOrderChange',
      resourceId: change.id,
      newValue: { changeNumber, poNumber: po.poNumber, previousTotal: Number(po.totalAmount), newTotal: Number(dto.newTotal) },
      source: 'api',
    });

    return change;
  }

  async approvePoChange(id: string, actorId: string) {
    const change = await this.prisma.purchaseOrderChange.findUnique({ where: { id } });
    if (!change) throw new NotFoundException({ code: 'PO_CHANGE_NOT_FOUND', message: 'PO change tidak ditemukan' });
    if (change.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa di-approve (${change.status})` });
    }

    const [approved, updatedPo] = await this.prisma.$transaction([
      this.prisma.purchaseOrderChange.update({ where: { id }, data: { status: 'APPROVED', approvedBy: actorId, approvedAt: new Date() } }),
      this.prisma.purchaseOrder.update({
        where: { id: change.purchaseOrderId },
        data: { totalAmount: change.newTotal, version: { increment: 1 } },
      }),
    ]);

    await this.audit.record({
      userId: actorId,
      action: 'PoChange.APPROVE',
      resource: 'PurchaseOrderChange',
      resourceId: id,
      newValue: { changeNumber: change.changeNumber, poNumber: updatedPo.poNumber, newTotal: Number(change.newTotal), version: updatedPo.version },
      source: 'api',
    });

    return { approved, poVersionAfter: updatedPo.version, totalAmountAfter: Number(updatedPo.totalAmount) };
  }

  async listPoChanges(poId: string) {
    const items = await this.prisma.purchaseOrderChange.findMany({
      where: { purchaseOrderId: poId },
      orderBy: { version: 'desc' },
    });
    return { items, total: items.length };
  }

  async createRating(dto: CreateVendorRatingDto, actorId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) throw new NotFoundException({ code: 'VENDOR_NOT_FOUND', message: 'Vendor tidak ditemukan' });

    const rating = await this.prisma.vendorPerformanceRating.create({
      data: {
        vendorId: dto.vendorId,
        projectId: dto.projectId ?? null,
        category: dto.category,
        score: dto.score,
        remark: dto.remark ?? null,
        ratedBy: actorId,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'VendorPerformance.CREATE',
      resource: 'VendorPerformanceRating',
      resourceId: rating.id,
      newValue: { vendor: vendor.name, category: dto.category, score: dto.score },
      source: 'api',
    });

    return rating;
  }

  async listRatings(query: ListRatingQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.VendorPerformanceRatingWhereInput = query.category ? { category: query.category } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vendorPerformanceRating.findMany({
        where,
        include: { vendor: { select: { vendorCode: true, name: true } }, project: { select: { code: true } } },
        orderBy: { ratingDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.vendorPerformanceRating.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async vendorPerformanceSummary() {
    const ratings = await this.prisma.vendorPerformanceRating.findMany({
      include: { vendor: { select: { vendorCode: true, name: true } } },
    });

    const byVendor = new Map<string, { vendorCode: string; vendorName: string; byCategory: Record<string, number[]>; all: number[] }>();
    for (const r of ratings) {
      const entry = byVendor.get(r.vendorId) ?? { vendorCode: r.vendor.vendorCode, vendorName: r.vendor.name, byCategory: {}, all: [] };
      (entry.byCategory[r.category] ??= []).push(r.score);
      entry.all.push(r.score);
      byVendor.set(r.vendorId, entry);
    }

    const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : 0);

    const items = [...byVendor.values()].map((v) => ({
      vendorCode: v.vendorCode,
      vendorName: v.vendorName,
      DELIVERY: avg(v.byCategory.DELIVERY ?? []),
      QUALITY: avg(v.byCategory.QUALITY ?? []),
      COMMERCIAL: avg(v.byCategory.COMMERCIAL ?? []),
      HSE: avg(v.byCategory.HSE ?? []),
      RESPONSIVENESS: avg(v.byCategory.RESPONSIVENESS ?? []),
      overall: avg(v.all),
    }));

    return { items, total: items.length, generatedAt: new Date().toISOString() };
  }
}
