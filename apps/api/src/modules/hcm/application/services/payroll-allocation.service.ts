import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreatePayrollAllocationDto, ListPayrollAllocationQueryDto } from '../../presentation/dto/hcm.dto';

@Injectable()
export class PayrollAllocationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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

  async listPayrollAllocations(query: ListPayrollAllocationQueryDto) {
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
}
