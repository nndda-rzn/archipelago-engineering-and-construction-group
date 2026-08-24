import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreateProjectDto, ListProjectQueryDto } from './dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async findAll(query: ListProjectQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ProjectWhereInput = {
      ...(query.status ? { status: query.status } : {}),
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
      include: { legalEntity: { select: { code: true, legalName: true } } },
    });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });
    return project;
  }

  async create(dto: CreateProjectDto, actorId: string) {
    const existing = await this.prisma.project.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException({ code: 'PROJECT_EXISTS', message: 'Kode project sudah digunakan' });

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

    return project;
  }

  // Project health (FR-PRJ-004, actual cost vs budget) — dari sumber immutable
  async health(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { legalEntity: { select: { code: true } } },
    });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    // Budget PUBLISHED per WBS
    const budgetItems = await this.prisma.budgetItem.findMany({ where: { projectId: id, status: 'PUBLISHED' } });
    const budgetByWbs = new Map<string, number>();
    let totalBudget = 0;
    for (const b of budgetItems) {
      const v = Number(b.amount);
      budgetByWbs.set(b.wbsItemId, (budgetByWbs.get(b.wbsItemId) ?? 0) + v);
      totalBudget += v;
    }

    // Actual cost dari stock ledger OUT (material issue) per WBS
    const ledgerOut = await this.prisma.stockLedgerEntry.groupBy({
      by: ['wbsItemId'],
      where: { projectId: id, movementType: 'OUT', totalValue: { not: null } },
      _sum: { totalValue: true },
    });
    const actualByWbs = new Map<string, number>();
    let ledgerActualTotal = 0;
    for (const row of ledgerOut) {
      const v = Math.abs(Number(row._sum.totalValue ?? 0));
      ledgerActualTotal += v;
      if (!row.wbsItemId) continue;
      actualByWbs.set(row.wbsItemId, (actualByWbs.get(row.wbsItemId) ?? 0) + v);
    }

    // Actual cost dari vendor invoice POSTED (Beban Material 6100 journal) — filter per project
    const postedInvoices = await this.prisma.vendorInvoice.findMany({
      where: { projectId: id, status: 'POSTED' },
      select: { id: true },
    });
    const postedInvoiceIds = postedInvoices.map((i) => i.id);
    const invoicePost = postedInvoiceIds.length
      ? await this.prisma.journal.findMany({
          where: { source: 'INVOICE', status: 'POSTED', sourceId: { in: postedInvoiceIds } },
          include: { lines: { where: { account: { code: { startsWith: '610' } } }, select: { debit: true } } },
        })
      : [];
    const invoiceActual = invoicePost.reduce((sum, j) => sum + j.lines.reduce((s, l) => s + Number(l.debit), 0), 0);

    const totalActual = ledgerActualTotal + invoiceActual;

    // Revenue: client invoice POSTED (Pendapatan 4100 journal) per project
    const postedClientInvoices = await this.prisma.clientInvoice.findMany({
      where: { projectId: id, status: 'POSTED' },
      select: { id: true },
    });
    const postedClientInvoiceIds = postedClientInvoices.map((i) => i.id);
    const revenuePost = postedClientInvoiceIds.length
      ? await this.prisma.journal.findMany({
          where: { source: 'CLIENT_INVOICE', status: 'POSTED', sourceId: { in: postedClientInvoiceIds } },
          include: { lines: { where: { account: { code: { startsWith: '410' } } }, select: { credit: true } } },
        })
      : [];
    const revenue = revenuePost.reduce((sum, j) => sum + j.lines.reduce((s, l) => s + Number(l.credit), 0), 0);

    const wbs = await this.prisma.wbsItem.findMany({
      where: { projectId: id },
      select: { id: true, code: true, name: true, parentId: true },
      orderBy: { code: 'asc' },
    });

    const wbsRows = wbs.map((w) => {
      const budget = budgetByWbs.get(w.id) ?? 0;
      const actual = actualByWbs.get(w.id) ?? 0;
      const variance = budget - actual;
      return {
        id: w.id,
        code: w.code,
        name: w.name,
        parentId: w.parentId,
        budget,
        actual,
        variance,
        utilization: budget > 0 ? Math.round((actual / budget) * 1000) / 10 : null,
      };
    });

    // Health status (project-health semantic): on-track / at-risk / critical
    const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : null;
    let health: 'NO_BUDGET' | 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
    if (totalBudget === 0) health = 'NO_BUDGET';
    else if (utilization! <= 70) health = 'ON_TRACK';
    else if (utilization! <= 90) health = 'AT_RISK';
    else health = 'CRITICAL';

    return {
      projectId: id,
      projectCode: project.code,
      projectName: project.name,
      client: project.client,
      legalEntityCode: project.legalEntity.code,
      contractValue: Number(project.contractValue ?? 0),
      totalBudget,
      totalActual,
      revenue,
      variance: totalBudget - totalActual,
      utilization,
      health,
      wbs: wbsRows,
      generatedAt: new Date().toISOString(),
    };
  }
}
