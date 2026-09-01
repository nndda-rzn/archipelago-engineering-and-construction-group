import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateEquipmentUtilizationDto } from '../../presentation/dto/equipment.dto';

@Injectable()
export class EquipmentUtilizationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-EQP-003: utilization — operating / available
  async createUtilization(equipmentId: string, dto: CreateEquipmentUtilizationDto, actorId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException({ code: 'EQUIPMENT_NOT_FOUND', message: 'Equipment tidak ditemukan' });

    const operating = Number(dto.operatingHours);
    const available = Number(dto.availableHours ?? 0);
    if (operating > available) {
      throw new BadRequestException({ code: 'INVALID_UTILIZATION', message: 'Operating hours tidak boleh melebihi available' });
    }

    const util = await this.prisma.equipmentUtilization.create({
      data: {
        equipmentId,
        projectId: dto.projectId ?? null,
        utilizationDate: dto.utilizationDate ? new Date(dto.utilizationDate) : new Date(),
        availableHours: available,
        operatingHours: operating,
        description: dto.description ?? null,
      },
    });

    // update meter (FR-EQP-001: currentMeter bertambah)
    if (operating > 0) {
      await this.prisma.equipment.update({
        where: { id: equipmentId },
        data: { currentMeter: { increment: operating } },
      });
    }

    await this.audit.record({
      userId: actorId,
      action: 'EquipmentUtilization.CREATE',
      resource: 'EquipmentUtilization',
      resourceId: util.id,
      newValue: { equipmentId, operatingHours: operating, availableHours: available },
      source: 'api',
    });

    return util;
  }

  async listUtilizations(equipmentId: string) {
    const items = await this.prisma.equipmentUtilization.findMany({
      where: { equipmentId },
      orderBy: { utilizationDate: 'desc' },
      take: 50,
    });
    return { items };
  }
}
