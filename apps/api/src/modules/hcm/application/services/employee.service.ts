import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateEmployeeDto, CreateProjectAssignmentDto, CreateTimesheetDto, EndAssignmentDto,
  ListEmployeeQueryDto, ListTimesheetQueryDto, ApproveTimesheetDto,
  CreatePayrollAllocationDto, ChangeEmployeeStatusDto,
} from '../../presentation/dto/hcm.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-HCM-001: employee master
  async createEmployee(dto: CreateEmployeeDto, actorId: string) {
    const legalEntity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!legalEntity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'EMP' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'EMP', prefix: `EMP-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const employee = await this.prisma.employee.create({
      data: {
        employeeNumber: seq,
        userId: dto.userId ?? null,
        legalEntityId: dto.legalEntityId,
        name: dto.name,
        position: dto.position,
        grade: dto.grade ?? null,
        department: dto.department ?? null,
        location: dto.location ?? null,
        costCenter: dto.costCenter ?? null,
        managerId: dto.managerId ?? null,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : null,
      },
      include: { legalEntity: { select: { code: true, legalName: true } }, manager: { select: { name: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Employee.CREATE',
      resource: 'Employee',
      resourceId: employee.id,
      newValue: { employeeNumber: seq, name: dto.name, position: dto.position },
      source: 'api',
    });

    return employee;
  }

  async listEmployees(query: ListEmployeeQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.EmployeeWhereInput = {
      ...(query.legalEntityId ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: { legalEntity: { select: { code: true } }, manager: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-HCM-002: multi-project assignment, FR-HCM-003: allocation >100% butuh exception approval
  async createAssignment(employeeId: string, dto: CreateProjectAssignmentDto, actorId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee tidak ditemukan' });
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const allocation = Number(dto.allocationPercent);
    const start = dto.startDate ? new Date(dto.startDate) : new Date();
    const end = dto.endDate ? new Date(dto.endDate) : null;

    // FR-HCM-003: total alokasi aktif >100% → wajib exceptionApproved
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

  // FR-HCM-004: timesheet ke project/WBS
  async createTimesheet(dto: CreateTimesheetDto, actorId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee tidak ditemukan' });
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });
    if (dto.wbsItemId) {
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
      if (!wbs || wbs.projectId !== dto.projectId) {
        throw new BadRequestException({ code: 'INVALID_WBS', message: 'WBS tidak valid untuk project ini' });
      }
    }

    const hours = Number(dto.hours);
    if (hours > 24) throw new BadRequestException({ code: 'INVALID_HOURS', message: 'Jam kerja maksimal 24' });

    const timesheet = await this.prisma.timesheet.create({
      data: {
        employeeId: dto.employeeId,
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId ?? null,
        workDate: dto.workDate ? new Date(dto.workDate) : new Date(),
        hours,
        activity: dto.activity ?? null,
        description: dto.description ?? null,
      },
      include: { employee: { select: { name: true } }, project: { select: { code: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Timesheet.SUBMIT',
      resource: 'Timesheet',
      resourceId: timesheet.id,
      newValue: { employeeId: dto.employeeId, projectId: dto.projectId, hours, workDate: timesheet.workDate },
      source: 'api',
    });

    return timesheet;
  }

  async approveTimesheet(id: string, dto: ApproveTimesheetDto, actorId: string) {
    const timesheet = await this.prisma.timesheet.findUnique({ where: { id } });
    if (!timesheet) throw new NotFoundException({ code: 'TIMESHEET_NOT_FOUND', message: 'Timesheet tidak ditemukan' });
    if (timesheet.status !== 'SUBMITTED') {
      throw new ConflictException({ code: 'NOT_SUBMITTED', message: `Hanya SUBMITTED yang bisa diproses (${timesheet.status})` });
    }

    const updated = await this.prisma.timesheet.update({
      where: { id },
      data: { status: dto.status === 'REJECTED' ? 'REJECTED' : 'APPROVED', approvedBy: actorId, approvedAt: new Date() },
    });

    await this.audit.record({
      userId: actorId,
      action: dto.status === 'REJECTED' ? 'Timesheet.REJECT' : 'Timesheet.APPROVE',
      resource: 'Timesheet',
      resourceId: id,
      newValue: { status: updated.status },
      source: 'api',
    });

    return updated;
  }

  async listTimesheets(query: ListTimesheetQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.TimesheetWhereInput = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.timesheet.findMany({
        where,
        include: { employee: { select: { name: true } }, project: { select: { code: true, name: true } } },
        orderBy: { workDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.timesheet.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-HCM-005: payroll allocation — project + corporate overhead, harus balance
  async createPayrollAllocation(dto: CreatePayrollAllocationDto, actorId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee tidak ditemukan' });

    const gross = Number(dto.grossAmount);
    const projectAmount = Number(dto.projectAmount ?? 0);
    const overheadAmount = Number(dto.overheadAmount ?? 0);
    if (Math.abs(gross - projectAmount - overheadAmount) > 0.01) {
      throw new BadRequestException({
        code: 'ALLOCATION_UNBALANCED',
        message: `Alokasi harus balance: project ${projectAmount} + overhead ${overheadAmount} ≠ gross ${gross}`,
      });
    }

    const allocation = await this.prisma.payrollAllocation.create({
      data: {
        employeeId: dto.employeeId,
        projectId: dto.projectId ?? null,
        period: dto.period,
        grossAmount: gross,
        projectAmount,
        overheadAmount,
        createdBy: actorId,
      },
      include: { employee: { select: { name: true } }, project: { select: { code: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'PayrollAllocation.CREATE',
      resource: 'PayrollAllocation',
      resourceId: allocation.id,
      newValue: { employeeId: dto.employeeId, period: dto.period, grossAmount: gross, projectAmount, overheadAmount },
      source: 'api',
    });

    return allocation;
  }

  async listPayrollAllocations(query: { page?: number; pageSize?: number; period?: string; employeeId?: string }) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.PayrollAllocationWhereInput = {
      ...(query.period ? { period: query.period } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payrollAllocation.findMany({
        where,
        include: { employee: { select: { name: true, employeeNumber: true } }, project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payrollAllocation.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-HCM-006: joiner-mover-leaver — status lifecycle, leaver → block user access
  async changeEmployeeStatus(id: string, dto: ChangeEmployeeStatusDto, actorId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id }, include: { user: { select: { id: true } } } });
    if (!employee) throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee tidak ditemukan' });

    const status = dto.status;
    if (!['ACTIVE', 'INACTIVE', 'LEAVER'].includes(status)) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: `Status tidak valid: ${status}` });
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        status,
        leaveDate: status === 'LEAVER' ? (dto.leaveDate ? new Date(dto.leaveDate) : new Date()) : null,
      },
    });

    // FR-HCM-006: leaver → blokir akses user terkait
    if (status === 'LEAVER' && employee.user) {
      await this.prisma.user.update({ where: { id: employee.user.id }, data: { status: 'BLOCKED' } });
    }
    if (status === 'ACTIVE' && employee.user) {
      await this.prisma.user.update({ where: { id: employee.user.id }, data: { status: 'ACTIVE' } });
    }

    await this.audit.record({
      userId: actorId,
      action: 'Employee.CHANGE_STATUS',
      resource: 'Employee',
      resourceId: id,
      newValue: { status, leaveDate: updated.leaveDate, userBlocked: status === 'LEAVER' && Boolean(employee.user) },
      source: 'api',
    });

    return updated;
  }
}
