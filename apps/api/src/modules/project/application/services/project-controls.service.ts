import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateControlAccountDto, CreateCostCodeDto, CreateForecastDto,
  ListControlAccountQueryDto, ListCostCodeQueryDto,
} from '../../presentation/dto/project-controls.dto';

@Injectable()
export class ProjectControlsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ─── FR-PRJ-003: CBS & Cost Code ────────────────────────────────────────────

  async createCostCode(projectId: string, dto: CreateCostCodeDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    if (dto.wbsItemId) {
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
      if (!wbs || wbs.projectId !== projectId) {
        throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS tidak ditemukan di project ini' });
      }
    }

    const exists = await this.prisma.costCode.findUnique({ where: { projectId_code: { projectId, code: dto.code } } });
    if (exists) throw new ConflictException({ code: 'COST_CODE_EXISTS', message: 'Kode cost code sudah digunakan' });

    const costCode = await this.prisma.costCode.create({
      data: {
        projectId,
        wbsItemId: dto.wbsItemId ?? null,
        code: dto.code,
        name: dto.name,
        costType: dto.costType ?? 'DIRECT',
      },
    });

    await this.audit.record({ userId: actorId, action: 'CostCode.CREATE', resource: 'CostCode', resourceId: costCode.id, newValue: { projectId, code: dto.code, name: dto.name }, source: 'api' });
    return costCode;
  }

  async listCostCodes(projectId: string, query: ListCostCodeQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.CostCodeWhereInput = {
      projectId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.costType ? { costType: query.costType } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.costCode.findMany({
        where,
        include: { wbsItem: { select: { code: true, name: true } } },
        orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.costCode.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── FR-PRJ-004: Control Account ────────────────────────────────────────────

  async createControlAccount(projectId: string, dto: CreateControlAccountDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
    if (!wbs || wbs.projectId !== projectId) {
      throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS tidak ditemukan di project ini' });
    }

    const exists = await this.prisma.controlAccount.findUnique({ where: { projectId_code: { projectId, code: dto.code } } });
    if (exists) throw new ConflictException({ code: 'CONTROL_ACCOUNT_EXISTS', message: 'Kode control account sudah digunakan' });

    const ca = await this.prisma.controlAccount.create({
      data: {
        projectId,
        wbsItemId: dto.wbsItemId,
        code: dto.code,
        name: dto.name,
        responsibleManager: dto.responsibleManager,
        budgetAmount: dto.budgetAmount ?? 0,
        plannedValue: dto.plannedValue ?? 0,
        scheduleStart: dto.scheduleStart ? new Date(dto.scheduleStart) : null,
        scheduleEnd: dto.scheduleEnd ? new Date(dto.scheduleEnd) : null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'ControlAccount.CREATE', resource: 'ControlAccount', resourceId: ca.id, newValue: { projectId, code: dto.code, name: dto.name, wbs: wbs.code }, source: 'api' });
    return ca;
  }

  async listControlAccounts(projectId: string, query: ListControlAccountQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.ControlAccountWhereInput = { projectId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.controlAccount.findMany({
        where,
        include: { wbsItem: { select: { code: true, name: true } } },
        orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.controlAccount.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── FR-PRJ-007: Commitment (PO/subcontract released → commitment) ──────────

  async commitment(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const [poAgg, subconAgg] = await Promise.all([
      this.prisma.purchaseOrder.aggregate({ where: { projectId, status: 'RELEASED' }, _sum: { totalAmount: true } }),
      this.prisma.subcontract.aggregate({ where: { projectId, status: 'ACTIVE' }, _sum: { contractValue: true } }),
    ]);

    const poCommitment = Number(poAgg._sum?.totalAmount ?? 0);
    const subcontractCommitment = Number(subconAgg._sum?.contractValue ?? 0);

    const budgetAgg = await this.prisma.budgetItem.aggregate({ where: { projectId, status: 'PUBLISHED' }, _sum: { amount: true } });
    const totalBudget = Number(budgetAgg._sum?.amount ?? 0);

    return {
      projectId,
      poCommitment,
      subcontractCommitment,
      totalCommitment: Math.round((poCommitment + subcontractCommitment) * 100) / 100,
      totalBudget,
      remainingBudget: Math.round((totalBudget - poCommitment - subcontractCommitment) * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── FR-PRJ-010: Forecast (ETC/EAC/VAC) ─────────────────────────────────────

  async createForecast(projectId: string, dto: CreateForecastDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    // Budget baseline (PUBLISHED) sebagai basis VAC
    const budgetAgg = await this.prisma.budgetItem.aggregate({ where: { projectId, status: 'PUBLISHED' }, _sum: { amount: true } });
    const budget = Number(budgetAgg._sum?.amount ?? 0);

    const last = await this.prisma.forecast.findFirst({ where: { projectId }, orderBy: { version: 'desc' } });
    const nextVersion = (last?.version ?? 0) + 1;

    const eac = Number(dto.estimateAtCompletion);
    const etc = dto.estimateToComplete != null ? Number(dto.estimateToComplete) : Math.max(eac - budget, 0);
    const vac = Math.round((budget - eac) * 100) / 100;

    const forecast = await this.prisma.forecast.create({
      data: {
        projectId,
        version: nextVersion,
        period: dto.period,
        estimateAtCompletion: eac,
        estimateToComplete: Math.round(etc * 100) / 100,
        varianceAtCompletion: vac,
        note: dto.note ?? null,
        createdBy: actorId,
      },
    });

    await this.audit.record({ userId: actorId, action: 'Forecast.CREATE', resource: 'Forecast', resourceId: forecast.id, newValue: { projectId, version: nextVersion, eac, etc, vac }, source: 'api' });
    return forecast;
  }

  async listForecasts(projectId: string) {
    const forecasts = await this.prisma.forecast.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    });
    return { items: forecasts, total: forecasts.length };
  }

  // ─── FR-PRJ-011: Earned Value (PV/EV/AC/CPI/SPI/CV/SV) ──────────────────────

  async earnedValue(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    // PV (Planned Value) = sum control account plannedValue (nilai pekerjaan dijadwalkan)
    const pvAgg = await this.prisma.controlAccount.aggregate({ where: { projectId }, _sum: { plannedValue: true } });
    const pv = Number(pvAgg._sum?.plannedValue ?? 0);

    // Budget baseline sebagai referensi total nilai pekerjaan (BAC)
    const budgetAgg = await this.prisma.budgetItem.aggregate({ where: { projectId, status: 'PUBLISHED' }, _sum: { amount: true } });
    const bac = Number(budgetAgg._sum?.amount ?? 0);

    // Progress fisik rata-rata dari work package (yang sudah ada progress)
    const wpAgg = await this.prisma.workPackageProgress.groupBy({
      by: ['workPackageId'],
      _max: { physicalProgress: true },
    });
    const wpIds = wpAgg.map((r) => r.workPackageId);
    const wps = wpIds.length
      ? await this.prisma.constructionWorkPackage.findMany({ where: { id: { in: wpIds }, projectId } })
      : [];
    const wpByProject = new Set(wps.map((w) => w.id));

    const progresses = wpAgg.filter((r) => wpByProject.has(r.workPackageId));
    const totalProgress = progresses.reduce((s, r) => s + Number(r._max.physicalProgress ?? 0), 0);
    const avgProgress = progresses.length ? totalProgress / progresses.length : 0;
    const progressPercent = Math.min(avgProgress, 100);

    // EV (Earned Value) = BAC × progress fisik rata-rata
    const ev = bac * (progressPercent / 100);

    // AC (Actual Cost) = journal beban 6100 + material issue ledger (konsisten dgn project health)
    const ledgerOut = await this.prisma.stockLedgerEntry.aggregate({
      where: { projectId, movementType: 'OUT', totalValue: { not: null } },
      _sum: { totalValue: true },
    });
    const ledgerActual = Math.abs(Number(ledgerOut._sum?.totalValue ?? 0));

    const postedInvoices = await this.prisma.vendorInvoice.findMany({ where: { projectId, status: 'POSTED' }, select: { id: true } });
    const postedInvoiceIds = postedInvoices.map((i) => i.id);
    const invoicePost = postedInvoiceIds.length
      ? await this.prisma.journal.findMany({
          where: { source: 'INVOICE', status: 'POSTED', sourceId: { in: postedInvoiceIds } },
          include: { lines: { where: { account: { code: { startsWith: '610' } } }, select: { debit: true } } },
        })
      : [];
    const invoiceActual = invoicePost.reduce((sum, j) => sum + j.lines.reduce((s, l) => s + Number(l.debit), 0), 0);
    const ac = ledgerActual + invoiceActual;

    const round = (n: number) => Math.round(n * 100) / 100;
    const cpi = ac > 0 ? ev / ac : null;
    const spi = pv > 0 ? ev / pv : null;
    const cv = ev - ac;
    const sv = ev - pv;

    return {
      projectId,
      projectCode: project.code,
      metrics: {
        pv: round(pv),
        ev: round(ev),
        ac: round(ac),
        bac: round(bac),
        progressPercent: round(progressPercent),
        cpi: cpi != null ? round(cpi) : null,
        spi: spi != null ? round(spi) : null,
        cv: round(cv),
        sv: round(sv),
      },
      interpretation: {
        cpi: cpi == null ? 'N/A' : cpi >= 1 ? 'ON_BUDGET' : 'OVER_BUDGET',
        spi: spi == null ? 'N/A' : spi >= 1 ? 'ON_SCHEDULE' : 'BEHIND_SCHEDULE',
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
