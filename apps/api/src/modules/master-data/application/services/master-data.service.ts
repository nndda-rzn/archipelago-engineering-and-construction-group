import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateVendorDto, ListVendorQueryDto, CreateFiscalPeriodDto, ListFiscalPeriodQueryDto, UpdateFiscalPeriodStatusDto,
} from '../../presentation/dto/master-data.dto';

@Injectable()
export class MasterDataService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createVendor(dto: CreateVendorDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'VND' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'VND', prefix: `VND-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const vendor = await this.prisma.vendor.create({
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

    await this.audit.record({ userId: actorId, action: 'Vendor.CREATE', resource: 'Vendor', resourceId: vendor.id, newValue: { vendorCode: seq, name: dto.name }, source: 'api' });
    return vendor;
  }

  async listVendors(query: ListVendorQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.VendorWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.vendor.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createFiscalPeriod(dto: CreateFiscalPeriodDto, actorId: string) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new ConflictException({ code: 'INVALID_PERIOD', message: 'endDate harus setelah startDate' });
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

  async updateFiscalPeriodStatus(id: string, dto: UpdateFiscalPeriodStatusDto, actorId: string) {
    const period = await this.prisma.fiscalPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND', message: 'Periode tidak ditemukan' });
    const updated = await this.prisma.fiscalPeriod.update({ where: { id }, data: { status: dto.status } });
    await this.audit.record({ userId: actorId, action: 'FiscalPeriod.STATUS', resource: 'FiscalPeriod', resourceId: id, newValue: { periodCode: period.periodCode, status: dto.status }, source: 'api' });
    return updated;
  }

  async listFiscalPeriods(query: ListFiscalPeriodQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.FiscalPeriodWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fiscalPeriod.findMany({ where, orderBy: { periodCode: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.fiscalPeriod.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
