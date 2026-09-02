import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateProjectAssignmentDto, EndAssignmentDto } from '../../presentation/dto/hcm.dto';

@Injectable()
export class ProjectAssignmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createAssignment(employeeId: string, dto: CreateProjectAssignmentDto, actorId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee tidak ditemukan' });
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const allocation = Number(dto.allocationPercent);
    const start = dto.startDate ? new Date(dto.startDate) : new Date();
    const end = dto.endDate ? new Date(dto.endDate) : null;

    const activeAssignments = await this.prisma.projectAssignment.findMany({
      where: { employeeId, status: 'ACTIVE' },
      select: { allocationPercent: true },
    });
    const currentTotal = activeAssignments.reduce((sum, a) => sum + Number(a.allocationPercent), 0);
    if (currentTotal + allocation > 100 && !dto.exceptionApproved) {
      throw new ConflictException({
        code: 'ALLOCATION_EXCEEDS',
        message: `Total alokasi ${currentTotal + allocation}% > 100% — butuh exception approval (FR-HCM-003)`,
      });
    }

    const assignment = await this.prisma.projectAssignment.create({
      data: {
        employeeId,
        projectId: dto.projectId,
        role: dto.role ?? null,
        allocationPercent: allocation,
        startDate: start,
        endDate: end,
        exceptionApproved: dto.exceptionApproved ?? false,
      },
      include: { project: { select: { code: true, name: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ProjectAssignment.CREATE',
      resource: 'ProjectAssignment',
      resourceId: assignment.id,
      newValue: { employeeId, projectId: dto.projectId, allocationPercent: allocation, exceptionApproved: assignment.exceptionApproved },
      source: 'api',
    });

    return assignment;
  }

  async endAssignment(employeeId: string, assignmentId: string, dto: EndAssignmentDto, actorId: string) {
    const assignment = await this.prisma.projectAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.employeeId !== employeeId) {
      throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Assignment tidak ditemukan' });
    }
    if (assignment.status !== 'ACTIVE') {
      throw new ConflictException({ code: 'NOT_ACTIVE', message: `Hanya ACTIVE yang bisa diakhiri (${assignment.status})` });
    }

    const ended = await this.prisma.projectAssignment.update({
      where: { id: assignmentId },
      data: { status: 'ENDED', endDate: dto.endDate ? new Date(dto.endDate) : new Date() },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ProjectAssignment.END',
      resource: 'ProjectAssignment',
      resourceId: assignmentId,
      newValue: { employeeId, endDate: ended.endDate },
      source: 'api',
    });

    return ended;
  }

  async listAssignments(employeeId: string) {
    const items = await this.prisma.projectAssignment.findMany({
      where: { employeeId },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { startDate: 'desc' },
    });
    return { items };
  }
}
