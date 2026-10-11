import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PROJECT_SORT_FIELDS, PROJECT_STATUSES, type ProjectRegister, type ProjectSortField, type UpdateProject } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import { ActualCostCalculator } from '@/shared/project/actual-cost.calculator';
import { classifyHealth } from '@/shared/project/project-health.classifier';
import type { AddProjectMemberDto, CreateProjectDto, ListProjectQueryDto, UpdateProjectMetaDto } from '../../presentation/dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(ActualCostCalculator) private readonly actualCost: ActualCostCalculator,
  ) {}

  /**
   * Register proyek: satu payload berisi metadata proyek + metrik biaya + health,
   * dipakai bersama oleh daftar (tabel/kartu/timeline) dan ringkasan.
   *
   * `sort`/`order` di-whitelist: kolom di luar `PROJECT_SORT_FIELDS` diabaikan dan
   * jatuh ke `createdAt desc` — mencegah kolom liar / error 500.
   */
  async register(query: { sort?: string; order?: string } = {}): Promise<ProjectRegister> {
    const sortField = (PROJECT_SORT_FIELDS as readonly string[]).includes(query.sort ?? '')
      ? (query.sort as ProjectSortField)
      : 'createdAt';
    const sortOrder: Prisma.SortOrder = query.order === 'asc' ? 'asc' : 'desc';

    const projects = await this.prisma.project.findMany({
      select: {
        id: true, code: true, name: true, client: true, manager: true, status: true,
        contractValue: true, startDate: true, completionDate: true, type: true, priority: true,
        managerRef: { select: { id: true, name: true, position: true } },
        directorRef: { select: { id: true, name: true, position: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { [sortField]: sortOrder },
    });

    if (projects.length === 0) {
      return {
        items: [],
        totals: { projectCount: 0, totalContract: 0, totalBudget: 0, totalActual: 0, totalVariance: 0 },
        healthCounts: { NO_BUDGET: 0, ON_TRACK: 0, AT_RISK: 0, CRITICAL: 0 },
        generatedAt: new Date().toISOString(),
      };
    }

    const projectIds = projects.map((p) => p.id);
    const [budgetGroups, actualMap, teamMembers] = await Promise.all([
      this.prisma.budgetItem.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, status: 'PUBLISHED' },
        _sum: { amount: true },
      }),
      this.actualCost.computeBatch(projectIds),
      this.prisma.projectAssignment.findMany({
        where: { projectId: { in: projectIds }, status: 'ACTIVE' },
        select: { projectId: true, isKeyMember: true, employee: { select: { id: true, name: true, position: true } } },
      }),
    ]);
    const budgetMap = new Map(budgetGroups.map((r) => [r.projectId, Number(r._sum?.amount ?? 0)]));
    // Anggota tim per proyek — key member didahulukan agar avatar yang tampil bermakna.
    const teamByProject = new Map<string, Array<{ id: string; name: string; position: string | null; isKeyMember: boolean }>>();
    for (const m of teamMembers) {
      const list = teamByProject.get(m.projectId) ?? [];
      list.push({ id: m.employee.id, name: m.employee.name, position: m.employee.position, isKeyMember: m.isKeyMember });
      teamByProject.set(m.projectId, list);
    }

    let totalContract = 0;
    let totalBudget = 0;
    let totalActual = 0;
    const healthCounts = { NO_BUDGET: 0, ON_TRACK: 0, AT_RISK: 0, CRITICAL: 0 };

    const items = projects.map((p) => {
      const budget = budgetMap.get(p.id) ?? 0;
      const actual = actualMap.get(p.id) ?? 0;
      const { utilization, health } = classifyHealth(budget, actual);
      healthCounts[health] += 1;
      totalContract += Number(p.contractValue ?? 0);
      totalBudget += budget;
      totalActual += actual;
      const team = (teamByProject.get(p.id) ?? []).sort((a, b) => Number(b.isKeyMember) - Number(a.isKeyMember));
      return {
        projectId: p.id,
        code: p.code,
        name: p.name,
        client: p.client,
        manager: p.manager,
        managerRef: p.managerRef,
        directorRef: p.directorRef,
        status: p.status,
        type: p.type,
        priority: p.priority,
        contractValue: Number(p.contractValue ?? 0),
        startDate: p.startDate ? p.startDate.toISOString() : null,
        completionDate: p.completionDate ? p.completionDate.toISOString() : null,
        budget,
        actual,
        variance: budget - actual,
        utilization: utilization != null ? Math.round(utilization * 10) / 10 : null,
        health,
        teamCount: team.length,
        team: team.slice(0, 4),
      };
    });

    return {
      items,
      totals: { projectCount: projects.length, totalContract, totalBudget, totalActual, totalVariance: totalBudget - totalActual },
      healthCounts,
      generatedAt: new Date().toISOString(),
    };
  }

  async findAll(query: ListProjectQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ProjectWhereInput = {
      ...(query.status && (PROJECT_STATUSES as readonly string[]).includes(query.status)
        ? { status: query.status as Prisma.ProjectWhereInput['status'] }
        : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { client: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        legalEntity: { select: { code: true, legalName: true } },
        managerRef: { select: { id: true, name: true, position: true } },
        directorRef: { select: { id: true, name: true, position: true } },
        _count: { select: { assignments: true, risks: true, contracts: true, wbsItems: true } },
      },
    });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    return project;
  }

  /** KPI strip halaman Projects. */
  async stats() {
    const [total, active, onHold, completed, critical, projects] = await this.prisma.$transaction([
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: 'ACTIVE' } }),
      this.prisma.project.count({ where: { status: 'ON_HOLD' } }),
      this.prisma.project.count({ where: { status: 'COMPLETED' } }),
      this.prisma.project.count({ where: { priority: 'CRITICAL' } }),
      this.prisma.project.findMany({ select: { contractValue: true, _count: { select: { assignments: true } } } }),
    ]);
    const totalContract = projects.reduce((s, p) => s + Number(p.contractValue ?? 0), 0);
    const withoutTeam = projects.filter((p) => p._count.assignments === 0).length;
    return { total, active, onHold, completed, critical, withoutTeam, totalContract };
  }

  /** Tim proyek — siapa mengerjakan, sebagai apa, alokasi berapa %. */
  async team(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const assignments = await this.prisma.projectAssignment.findMany({
      where: { projectId: id, status: 'ACTIVE' },
      orderBy: [{ isKeyMember: 'desc' }, { startDate: 'asc' }],
      select: {
        id: true, role: true, allocationPercent: true, startDate: true, endDate: true,
        isKeyMember: true, status: true,
        employee: { select: { id: true, name: true, position: true, department: true, grade: true, employeeNumber: true } },
      },
    });
    return {
      items: assignments.map((a) => ({
        assignmentId: a.id,
        employeeId: a.employee.id,
        name: a.employee.name,
        position: a.employee.position,
        department: a.employee.department,
        grade: a.employee.grade,
        employeeNumber: a.employee.employeeNumber,
        role: a.role,
        allocationPercent: Number(a.allocationPercent),
        startDate: a.startDate.toISOString(),
        endDate: a.endDate ? a.endDate.toISOString() : null,
        isKeyMember: a.isKeyMember,
        status: a.status,
      })),
      total: assignments.length,
      totalAllocation: assignments.reduce((s, a) => s + Number(a.allocationPercent), 0),
    };
  }

  /** Tugaskan karyawan ke proyek. */
  async addMember(id: string, dto: AddProjectMemberDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' });

    const existing = await this.prisma.projectAssignment.findFirst({ where: { employeeId: dto.employeeId, projectId: id, status: 'ACTIVE' } });
    if (existing) throw new ConflictException({ code: 'MEMBER_EXISTS', message: `${employee.name} is already on this project` });

    const assignment = await this.prisma.projectAssignment.create({
      data: {
        employeeId: dto.employeeId,
        projectId: id,
        role: dto.role ?? null,
        allocationPercent: dto.allocationPercent,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isKeyMember: dto.isKeyMember ?? false,
      },
    });
    await this.audit.record({ userId: actorId, action: 'PROJECT.MEMBER_ADD', resource: 'Project', resourceId: id, newValue: { employeeId: dto.employeeId, role: dto.role, allocation: dto.allocationPercent }, source: 'api' });
    await this.recordActivity(id, actorId, 'PROJECT.MEMBER_ADD', `${employee.name} joined as ${dto.role ?? 'team member'}`);
    await invalidateAnalytics(this.cache);
    return { assignmentId: assignment.id, employeeId: dto.employeeId };
  }

  /** Cabut anggota dari proyek (set status ENDED + endDate). */
  async removeMember(id: string, assignmentId: string, actorId: string) {
    const assignment = await this.prisma.projectAssignment.findUnique({ where: { id: assignmentId }, include: { employee: { select: { name: true } } } });
    if (!assignment || assignment.projectId !== id) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Assignment not found' });
    if (assignment.status !== 'ACTIVE') throw new ConflictException({ code: 'NOT_ACTIVE', message: 'Assignment is not active' });

    await this.prisma.projectAssignment.update({ where: { id: assignmentId }, data: { status: 'ENDED', endDate: new Date(), endedReason: 'Removed from project' } });
    await this.audit.record({ userId: actorId, action: 'PROJECT.MEMBER_REMOVE', resource: 'Project', resourceId: id, oldValue: { employeeId: assignment.employeeId }, source: 'api' });
    await this.recordActivity(id, actorId, 'PROJECT.MEMBER_REMOVE', `${assignment.employee.name} removed from project`);
    await invalidateAnalytics(this.cache);
    return { assignmentId, removed: true };
  }

  /** Ubah type/priority/manager/director (orang). */
  async updateMeta(id: string, dto: UpdateProjectMetaDto, actorId: string) {
    const before = await this.prisma.project.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.managerId !== undefined) data.managerRef = dto.managerId ? { connect: { id: dto.managerId } } : { disconnect: true };
    if (dto.directorId !== undefined) data.directorRef = dto.directorId ? { connect: { id: dto.directorId } } : { disconnect: true };

    const updated = await this.prisma.project.update({ where: { id }, data });
    await this.audit.record({ userId: actorId, action: 'PROJECT.UPDATE', resource: 'Project', resourceId: id, oldValue: { type: before.type, priority: before.priority }, newValue: data as Record<string, unknown>, source: 'api' });
    await this.recordActivity(id, actorId, 'PROJECT.UPDATE', 'Project metadata updated');
    await invalidateAnalytics(this.cache);
    return updated;
  }

  private async recordActivity(projectId: string, actorId: string | null, action: string, summary: string, metadata?: Prisma.InputJsonValue) {
    await this.prisma.projectActivity.create({ data: { projectId, actorId, action, summary, ...(metadata !== undefined ? { metadata } : {}) } });
  }

  /**
   * Ubah metadata proyek yang boleh diedit. **`code` dan `legalEntityId` sengaja
   * tidak dapat diubah** (kode adalah identitas, entity menentukan pembukuan);
   * keduanya diabaikan walau dikirim, bukan error — supaya klien lama tetap aman.
   * Tanggal kosong ('') → `null`; status divalidasi terhadap daftar resmi.
   */
  async update(id: string, input: UpdateProject, actorId: string) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    if (input.status !== undefined && !(PROJECT_STATUSES as readonly string[]).includes(input.status)) {
      throw new BadRequestException({ code: 'PROJECT_STATUS_INVALID', message: `Unknown status: ${input.status}` });
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.client !== undefined) data.client = input.client;
    if (input.businessUnit !== undefined) data.businessUnit = input.businessUnit || null;
    if (input.location !== undefined) data.location = input.location || null;
    if (input.contractValue !== undefined) data.contractValue = input.contractValue;
    if (input.advanceAmount !== undefined) data.advanceAmount = input.advanceAmount;
    if (input.advanceRecoveryRate !== undefined) data.advanceRecoveryRate = input.advanceRecoveryRate;
    if (input.director !== undefined) data.director = input.director || null;
    if (input.manager !== undefined) data.manager = input.manager || null;
    if (input.status !== undefined) data.status = input.status;
    if (input.startDate !== undefined) data.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.completionDate !== undefined) data.completionDate = input.completionDate ? new Date(input.completionDate) : null;

    const updated = await this.prisma.project.update({ where: { id }, data });

    await this.audit.record({
      userId: actorId,
      action: 'PROJECT.UPDATE',
      resource: 'Project',
      resourceId: id,
      newValue: data as Record<string, unknown>,
      source: 'api',
    });
    await this.recordActivity(id, actorId, 'PROJECT.UPDATE', 'Project details updated');

    await invalidateAnalytics(this.cache);
    return updated;
  }

  async create(dto: CreateProjectDto, actorId: string) {
    const existing = await this.prisma.project.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException({ code: 'PROJECT_EXISTS', message: 'Project code already in use' });

    const project = await this.prisma.project.create({
      data: {
        code: dto.code,
        name: dto.name,
        client: dto.client,
        legalEntityId: dto.legalEntityId,
        businessUnit: dto.businessUnit ?? null,
        location: dto.location ?? null,
        currency: dto.currency ?? 'IDR',
        contractValue: dto.contractValue ?? null,
        advanceAmount: dto.advanceAmount ?? null,
        advanceRecoveryRate: dto.advanceRecoveryRate ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        completionDate: dto.completionDate ? new Date(dto.completionDate) : null,
        director: dto.director ?? null,
        manager: dto.manager ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'PROJECT.CREATE',
      resource: 'Project',
      resourceId: project.id,
      newValue: { code: project.code, name: project.name, client: project.client },
      source: 'api',
    });
    await this.recordActivity(project.id, actorId, 'PROJECT.CREATE', `Project ${project.code} created`);

    await invalidateAnalytics(this.cache);

    return project;
  }

  /** Timeline aktivitas proyek. */
  async activity(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    return this.prisma.projectActivity.findMany({ where: { projectId: id }, orderBy: { at: 'desc' }, take: 50 });
  }
}
