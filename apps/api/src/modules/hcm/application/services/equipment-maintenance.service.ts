import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import type { CreateEquipmentPmDto, CreateEquipmentBreakdownDto } from '../../presentation/dto/equipment.dto';

@Injectable()
export class EquipmentMaintenanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async createPm(equipmentId: string, dto: CreateEquipmentPmDto, actorId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException({ code: 'EQUIPMENT_NOT_FOUND', message: 'Equipment not found' });

    const pm = await this.prisma.equipmentPm.create({
      data: {
        equipmentId,
        triggerType: dto.triggerType ?? 'DATE',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        dueMeter: dto.dueMeter ?? null,
        scheduledDate: new Date(),
        description: dto.description ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'EquipmentPm.CREATE',
      resource: 'EquipmentPm',
      resourceId: pm.id,
      newValue: { equipmentId, triggerType: pm.triggerType },
      source: 'api',
    });

    await invalidateAnalytics(this.cache);

    return pm;
  }

  async completePm(equipmentId: string, pmId: string, actorId: string) {
    const pm = await this.prisma.equipmentPm.findUnique({ where: { id: pmId } });
    if (!pm || pm.equipmentId !== equipmentId) {
      throw new NotFoundException({ code: 'PM_NOT_FOUND', message: 'PM schedule not found' });
    }
    if (pm.status !== 'SCHEDULED') {
      throw new ConflictException({ code: 'NOT_SCHEDULED', message: `Only SCHEDULED can be completed (${pm.status})` });
    }

    const done = await this.prisma.equipmentPm.update({
      where: { id: pmId },
      data: { status: 'DONE', completedAt: new Date() },
    });

    await this.audit.record({
      userId: actorId,
      action: 'EquipmentPm.COMPLETE',
      resource: 'EquipmentPm',
      resourceId: pmId,
      newValue: { equipmentId },
      source: 'api',
    });

    await invalidateAnalytics(this.cache);

    return done;
  }

  async listPms(equipmentId: string) {
    const items = await this.prisma.equipmentPm.findMany({
      where: { equipmentId },
      orderBy: { scheduledDate: 'desc' },
      take: 50,
    });
    return { items };
  }

  async createBreakdown(equipmentId: string, dto: CreateEquipmentBreakdownDto, actorId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException({ code: 'EQUIPMENT_NOT_FOUND', message: 'Equipment not found' });

    const breakdown = await this.prisma.$transaction(async (tx) => {
      const created = await tx.equipmentBreakdown.create({
        data: {
          equipmentId,
          breakdownDate: dto.breakdownDate ? new Date(dto.breakdownDate) : new Date(),
          downtimeHours: Number(dto.downtimeHours),
          costImpact: dto.costImpact ?? 0,
          description: dto.description ?? null,
        },
      });

      await tx.equipment.update({ where: { id: equipmentId }, data: { status: 'BREAKDOWN' } });

      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'EquipmentBreakdown.CREATE',
      resource: 'EquipmentBreakdown',
      resourceId: breakdown.id,
      newValue: { equipmentId, downtimeHours: Number(dto.downtimeHours), costImpact: dto.costImpact ?? 0 },
      source: 'api',
    });

    return breakdown;
  }

  async resolveBreakdown(equipmentId: string, breakdownId: string, actorId: string) {
    const bd = await this.prisma.equipmentBreakdown.findUnique({ where: { id: breakdownId } });
    if (!bd || bd.equipmentId !== equipmentId) {
      throw new NotFoundException({ code: 'BREAKDOWN_NOT_FOUND', message: 'Breakdown not found' });
    }
    if (bd.status !== 'OPEN') {
      throw new ConflictException({ code: 'NOT_OPEN', message: `Only OPEN can be resolved (${bd.status})` });
    }

    const resolved = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.equipmentBreakdown.update({
        where: { id: breakdownId },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });

      const openCount = await tx.equipmentBreakdown.count({ where: { equipmentId, status: 'OPEN' } });
      if (openCount === 0) {
        await tx.equipment.update({ where: { id: equipmentId }, data: { status: 'AVAILABLE' } });
      }

      return updated;
    });

    await this.audit.record({
      userId: actorId,
      action: 'EquipmentBreakdown.RESOLVE',
      resource: 'EquipmentBreakdown',
      resourceId: breakdownId,
      newValue: { equipmentId },
      source: 'api',
    });

    return resolved;
  }

  async listBreakdowns(equipmentId: string) {
    const items = await this.prisma.equipmentBreakdown.findMany({
      where: { equipmentId },
      orderBy: { breakdownDate: 'desc' },
      take: 50,
    });
    return { items };
  }
}
