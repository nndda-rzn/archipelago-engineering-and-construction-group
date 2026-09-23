import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateEmployeeDto, ListEmployeeQueryDto } from '../../presentation/dto/hcm.dto';

@Injectable()
export class EmployeeMasterService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createEmployee(dto: CreateEmployeeDto, actorId: string) {
    const legalEntity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!legalEntity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const employee = await this.prisma.$transaction(async (tx) => {
      const seq = await this.seq.next('EMP', `EMP-${new Date().getFullYear()}-`, tx);
      return tx.employee.create({
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
    });

    await this.audit.record({
      userId: actorId,
      action: 'Employee.CREATE',
      resource: 'Employee',
      resourceId: employee.id,
      newValue: { employeeNumber: employee.employeeNumber, name: dto.name, position: dto.position },
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
}
