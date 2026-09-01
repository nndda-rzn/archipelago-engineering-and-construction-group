import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { ChangeEmployeeStatusDto } from '../../presentation/dto/hcm.dto';

@Injectable()
export class EmployeeLifecycleService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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
