import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateEquipmentDto, ListEquipmentQueryDto } from '../../presentation/dto/equipment.dto';

@Injectable()
export class EquipmentMasterService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createEquipment(dto: CreateEquipmentDto, actorId: string) {
    const equipment = await this.prisma.$transaction(async (tx) => {
      const seq = await this.seq.next('EQ', `EQ-${new Date().getFullYear()}-`, tx);
      return tx.equipment.create({
        data: {
          equipmentNumber: seq,
          name: dto.name,
          category: dto.category ?? 'HEAVY',
          serialNumber: dto.serialNumber ?? null,
          owner: dto.owner ?? 'COMPANY',
          acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : null,
          currentMeter: dto.currentMeter ?? 0,
          legalEntityId: dto.legalEntityId ?? null,
        },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Equipment.CREATE',
      resource: 'Equipment',
      resourceId: equipment.id,
      newValue: { equipmentNumber: equipment.equipmentNumber, name: dto.name, category: dto.category ?? 'HEAVY' },
      source: 'api',
    });

    return equipment;
  }

  async listEquipment(query: ListEquipmentQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.EquipmentWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.equipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
