import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateEquipmentDto, CreateEquipmentAssignmentDto, CreateEquipmentUtilizationDto,
  CreateEquipmentPmDto, CreateEquipmentBreakdownDto, CreateEquipmentUsageDto, ListEquipmentQueryDto,
} from '../../presentation/dto/equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-EQP-001: equipment master
  async createEquipment(dto: CreateEquipmentDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'EQ' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'EQ', prefix: `EQ-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const equipment = await this.prisma.equipment.create({
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

    await this.audit.record({
      userId: actorId,
      action: 'Equipment.CREATE',
      resource: 'Equipment',
      resourceId: equipment.id,
      newValue: { equipmentNumber: seq, name: dto.name, category: dto.category ?? 'HEAVY' },
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

  // FR-EQP-002: assignment effective-dated — assign → status ASSIGNED
  async createAssignment(equipmentId: string, dto: CreateEquipmentAssignmentDto, actorId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException({ code: 'EQUIPMENT_NOT_FOUND', message: 'Equipment tidak ditemukan' });
    if (equipment.status !== 'AVAILABLE' && equipment.status !== 'ASSIGNED') {
      throw new ConflictException({ code: 'EQUIPMENT_UNAVAILABLE', message: `Equipment ${equipment.status} — tidak bisa di-assign` });
    }
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const assignment = await this.prisma.equipmentAssignment.create({
      data: {
        equipmentId,
        projectId: dto.projectId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
      include: { project: { select: { code: true, name: true } } },
    });

    await this.prisma.equipment.update({ where: { id: equipmentId }, data: { status: 'ASSIGNED' } });

    await this.audit.record({
      userId: actorId,
      action: 'EquipmentAssignment.CREATE',
      resource: 'EquipmentAssignment',
      resourceId: assignment.id,
      newValue: { equipmentId, projectId: dto.projectId },
      source: 'api',
    });

    return assignment;
  }

  async endAssignment(equipmentId: string, assignmentId: string, actorId: string) {
    const assignment = await this.prisma.equipmentAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.equipmentId !== equipmentId) {
      throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Assignment tidak ditemukan' });
    }
    if (assignment.status !== 'ACTIVE') {
      throw new ConflictException({ code: 'NOT_ACTIVE', message: `Hanya ACTIVE yang bisa diakhiri (${assignment.status})` });
    }

    const ended = await this.prisma.equipmentAssignment.update({
      where: { id: assignmentId },
      data: { status: 'ENDED', endDate: new Date() },
    });

    // kembalikan ke AVAILABLE bila tak ada assignment ACTIVE lain
    const stillActive = await this.prisma.equipmentAssignment.count({
      where: { equipmentId, status: 'ACTIVE' },
    });
    if (stillActive === 0) {
      await this.prisma.equipment.update({ where: { id: equipmentId }, data: { status: 'AVAILABLE' } });
    }

    await this.audit.record({
      userId: actorId,
      action: 'EquipmentAssignment.END',
      resource: 'EquipmentAssignment',
      resourceId: assignmentId,
      newValue: { equipmentId },
      source: 'api',
    });

    return ended;
  }

  async listAssignments(equipmentId: string) {
    const items = await this.prisma.equipmentAssignment.findMany({
      where: { equipmentId },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { startDate: 'desc' },
    });
    return { items };
  }

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

  // FR-EQP-004: PM schedule (DATE | HOURS | METER)
  async createPm(equipmentId: string, dto: CreateEquipmentPmDto, actorId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException({ code: 'EQUIPMENT_NOT_FOUND', message: 'Equipment tidak ditemukan' });

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

    return pm;
  }

  async completePm(equipmentId: string, pmId: string, actorId: string) {
    const pm = await this.prisma.equipmentPm.findUnique({ where: { id: pmId } });
    if (!pm || pm.equipmentId !== equipmentId) {
      throw new NotFoundException({ code: 'PM_NOT_FOUND', message: 'PM schedule tidak ditemukan' });
    }
    if (pm.status !== 'SCHEDULED') {
      throw new ConflictException({ code: 'NOT_SCHEDULED', message: `Hanya SCHEDULED yang bisa diselesaikan (${pm.status})` });
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

  // FR-EQP-005: breakdown — downtime + cost impact, status OPEN → RESOLVED
  async createBreakdown(equipmentId: string, dto: CreateEquipmentBreakdownDto, actorId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException({ code: 'EQUIPMENT_NOT_FOUND', message: 'Equipment tidak ditemukan' });

    const breakdown = await this.prisma.equipmentBreakdown.create({
      data: {
        equipmentId,
        breakdownDate: dto.breakdownDate ? new Date(dto.breakdownDate) : new Date(),
        downtimeHours: Number(dto.downtimeHours),
        costImpact: dto.costImpact ?? 0,
        description: dto.description ?? null,
      },
    });

    await this.prisma.equipment.update({ where: { id: equipmentId }, data: { status: 'BREAKDOWN' } });

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
      throw new NotFoundException({ code: 'BREAKDOWN_NOT_FOUND', message: 'Breakdown tidak ditemukan' });
    }
    if (bd.status !== 'OPEN') {
      throw new ConflictException({ code: 'NOT_OPEN', message: `Hanya OPEN yang bisa di-resolve (${bd.status})` });
    }

    const resolved = await this.prisma.equipmentBreakdown.update({
      where: { id: breakdownId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    // kembali ke AVAILABLE bila tak ada breakdown OPEN lain
    const openCount = await this.prisma.equipmentBreakdown.count({ where: { equipmentId, status: 'OPEN' } });
    if (openCount === 0) {
      await this.prisma.equipment.update({ where: { id: equipmentId }, data: { status: 'AVAILABLE' } });
    }

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

  // FR-EQP-006: usage → project cost
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
