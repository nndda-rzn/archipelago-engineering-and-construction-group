import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreateWarehouseDto, ListWarehouseQueryDto } from '../dto/inventory.dto';

@Injectable()
export class WarehouseService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createWarehouse(dto: CreateWarehouseDto, actorId: string) {
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        code: dto.code,
        name: dto.name,
        warehouseType: dto.warehouseType ?? 'PROJECT',
        projectId: dto.projectId ?? null,
        location: dto.location ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Warehouse.CREATE',
      resource: 'Warehouse',
      resourceId: warehouse.id,
      newValue: { code: warehouse.code, warehouseType: warehouse.warehouseType },
      source: 'api',
    });

    return warehouse;
  }

  async listWarehouses(query: ListWarehouseQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.WarehouseWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        include: { project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}