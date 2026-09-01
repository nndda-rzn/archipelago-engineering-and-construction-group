import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { ApproveTimesheetDto, CreateTimesheetDto, ListTimesheetQueryDto } from '../../presentation/dto/hcm.dto';

@Injectable()
export class TimesheetService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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
}
