import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateVendorDto, ListVendorQueryDto, UpdateVendorDto, SetVendorStatusDto,
  CreateFiscalPeriodDto, ListFiscalPeriodQueryDto, UpdateFiscalPeriodStatusDto, ListNumberSequenceQueryDto,
} from '../../presentation/dto/master-data.dto';

/** Urutan transisi maju status periode fiskal — satu sumber untuk validasi BE & UI. */
export const FISCAL_PERIOD_FLOW = ['FUTURE', 'OPEN', 'SOFT_CLOSED', 'CLOSED', 'LOCKED'] as const;
export type FiscalPeriodStatusValue = (typeof FISCAL_PERIOD_FLOW)[number];

@Injectable()
export class MasterDataService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createVendor(dto: CreateVendorDto, actorId: string) {
    const vendor = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'VND' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'VND', prefix: `VND-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.vendor.create({
        data: {
          vendorCode: seq,
          name: dto.name,
          taxId: dto.taxId ?? null,
          category: dto.category ?? 'MATERIAL',
          contactPerson: dto.contactPerson ?? null,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          address: dto.address ?? null,
        },
      });
    });

    await this.audit.record({ userId: actorId, action: 'Vendor.CREATE', resource: 'Vendor', resourceId: vendor.id, newValue: { vendorCode: vendor.vendorCode, name: dto.name }, source: 'api' });
    return vendor;
  }

  async listVendors(query: ListVendorQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const search = query.search?.trim();
    const where: Prisma.VendorWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { vendorCode: { contains: search, mode: 'insensitive' } },
              { taxId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.vendor.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** Ringkasan register vendor untuk KPI strip (bukan sekadar daftar). */
  async vendorStats() {
    const [total, active, inactive, vendors, rated] = await this.prisma.$transaction([
      this.prisma.vendor.count(),
      this.prisma.vendor.count({ where: { status: 'ACTIVE' } }),
      this.prisma.vendor.count({ where: { status: 'INACTIVE' } }),
      this.prisma.vendor.findMany({ select: { category: true } }),
      this.prisma.vendorPerformanceRating.findMany({ select: { score: true } }),
    ]);
    const avgScore = rated.length > 0 ? Math.round((rated.reduce((s, r) => s + r.score, 0) / rated.length) * 100) / 100 : null;
    const counts = new Map<string, number>();
    for (const v of vendors) counts.set(v.category, (counts.get(v.category) ?? 0) + 1);
    return {
      total,
      active,
      inactive,
      avgScore,
      ratingCount: rated.length,
      byCategory: [...counts.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async findVendor(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: { ratings: { orderBy: { ratingDate: 'desc' } } },
    });
    if (!vendor) throw new NotFoundException({ code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' });

    // Ringkasan performa per kategori + spend/pengadaan nyata (dari vendor invoice).
    const [invoices, poCount] = await this.prisma.$transaction([
      this.prisma.vendorInvoice.findMany({ where: { vendor: vendor.name, status: 'POSTED' }, select: { totalAmount: true } }),
      this.prisma.purchaseOrder.count({ where: { vendor: vendor.name } }),
    ]);
    const byCategory: Record<string, { count: number; avg: number }> = {};
    for (const r of vendor.ratings) {
      const e = (byCategory[r.category] ??= { count: 0, avg: 0 });
      e.avg = (e.avg * e.count + r.score) / (e.count + 1);
      e.count += 1;
    }
    for (const k of Object.keys(byCategory)) byCategory[k]!.avg = Math.round(byCategory[k]!.avg * 100) / 100;

    return {
      vendor,
      performance: {
        overall: vendor.ratings.length > 0 ? Math.round((vendor.ratings.reduce((s, r) => s + r.score, 0) / vendor.ratings.length) * 100) / 100 : null,
        count: vendor.ratings.length,
        byCategory,
      },
      spend: {
        postedInvoiceValue: invoices.reduce((s, i) => s + Number(i.totalAmount), 0),
        invoiceCount: invoices.length,
        poCount,
      },
    };
  }

  async updateVendor(id: string, dto: UpdateVendorDto, actorId: string) {
    const before = await this.prisma.vendor.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' });
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.contactPerson !== undefined ? { contactPerson: dto.contactPerson || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address || null } : {}),
      },
    });
    await this.audit.record({
      userId: actorId, action: 'Vendor.UPDATE', resource: 'Vendor', resourceId: id,
      oldValue: { name: before.name, category: before.category }, newValue: { name: vendor.name, category: vendor.category }, source: 'api',
    });
    return vendor;
  }

  async setVendorStatus(id: string, dto: SetVendorStatusDto, actorId: string) {
    const before = await this.prisma.vendor.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' });
    const vendor = await this.prisma.vendor.update({ where: { id }, data: { status: dto.status } });
    await this.audit.record({
      userId: actorId, action: 'Vendor.STATUS', resource: 'Vendor', resourceId: id,
      oldValue: { status: before.status }, newValue: { status: dto.status }, source: 'api',
    });
    return vendor;
  }

  async createFiscalPeriod(dto: CreateFiscalPeriodDto, actorId: string) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new ConflictException({ code: 'INVALID_PERIOD', message: 'endDate must be after startDate' });
    }
    const period = await this.prisma.fiscalPeriod.create({
      data: {
        periodCode: dto.periodCode,
        periodYear: Number(dto.periodYear),
        periodMonth: Number(dto.periodMonth),
        startDate: start,
        endDate: end,
      },
    });
    await this.audit.record({ userId: actorId, action: 'FiscalPeriod.CREATE', resource: 'FiscalPeriod', resourceId: period.id, newValue: { periodCode: dto.periodCode, status: 'FUTURE' }, source: 'api' });
    return period;
  }

  /**
   * Ubah status periode fiskal dengan **aturan transisi**:
   * - Maju tepat satu langkah (FUTURE → OPEN → SOFT_CLOSED → CLOSED → LOCKED).
   * - Mundur tepat satu langkah ("reopen"), kecuali dari LOCKED (final, tak bisa dibuka).
   * Lompatan atau arah tak sah → 409 INVALID_TRANSITION (sebelumnya status apa pun diterima).
   */
  async updateFiscalPeriodStatus(id: string, dto: UpdateFiscalPeriodStatusDto, actorId: string) {
    const period = await this.prisma.fiscalPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND', message: 'Fiscal period not found' });

    const from = period.status as FiscalPeriodStatusValue;
    const to = dto.status as FiscalPeriodStatusValue;
    const fromIdx = FISCAL_PERIOD_FLOW.indexOf(from);
    const toIdx = FISCAL_PERIOD_FLOW.indexOf(to);
    const isForward = toIdx === fromIdx + 1;
    const isBackward = toIdx === fromIdx - 1 && from !== 'LOCKED';
    if (!isForward && !isBackward) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Cannot move fiscal period from ${from} to ${to}`,
      });
    }

    const updated = await this.prisma.fiscalPeriod.update({ where: { id }, data: { status: dto.status } });
    await this.audit.record({
      userId: actorId, action: 'FiscalPeriod.STATUS', resource: 'FiscalPeriod', resourceId: id,
      oldValue: { status: from }, newValue: { status: to }, source: 'api',
    });
    return updated;
  }

  async listFiscalPeriods(query: ListFiscalPeriodQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const periodYear = query.periodYear != null ? Number(query.periodYear) : undefined;
    const where: Prisma.FiscalPeriodWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(periodYear && Number.isFinite(periodYear) ? { periodYear } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fiscalPeriod.findMany({ where, orderBy: { periodCode: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.fiscalPeriod.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** Register nomor dokumen (read-only) — prefix + nomor berikutnya per jenis dokumen. */
  async listNumberSequences(query: ListNumberSequenceQueryDto) {
    const where: Prisma.NumberSequenceWhereInput = query.status ? { status: query.status } : {};
    const items = await this.prisma.numberSequence.findMany({ where, orderBy: { code: 'asc' } });
    return { items, total: items.length };
  }
}
