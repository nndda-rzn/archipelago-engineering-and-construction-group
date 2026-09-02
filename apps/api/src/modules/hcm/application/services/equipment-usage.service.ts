import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateEquipmentUsageDto } from '../../presentation/dto/equipment.dto';

@Injectable()
export class EquipmentUsageService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createUsage(equipmentId: string, dto: CreateEquipmentUsageDto, actorId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException({ code: 'EQUIPMENT_NOT_FOUND', message: 'Equipment tidak ditemukan' });
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const usage = await this.prisma.equipmentUsage.create({
      data: {
        equipmentId,
        projectId: dto.projectId,
        usageDate: dto.usageDate ? new Date(dto.usageDate) : new Date(),
        hours: Number(dto.hours),
        costAmount: Number(dto.costAmount),
        description: dto.description ?? null,
      },
      include: { project: { select: { code: true, name: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'EquipmentUsage.CREATE',
      resource: 'EquipmentUsage',
      resourceId: usage.id,
      newValue: { equipmentId, projectId: dto.projectId, hours: Number(dto.hours), costAmount: Number(dto.costAmount) },
      source: 'api',
    });

    return usage;
  }

  async listUsages(equipmentId: string) {
    const items = await this.prisma.equipmentUsage.findMany({
      where: { equipmentId },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { usageDate: 'desc' },
      take: 50,
    });
    return { items };
  }
}
