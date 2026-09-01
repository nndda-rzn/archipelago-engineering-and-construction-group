import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateEquipmentAssignmentDto } from '../../presentation/dto/equipment.dto';

@Injectable()
export class EquipmentAssignmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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
}
