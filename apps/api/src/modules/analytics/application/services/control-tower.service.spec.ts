import { computeAttainment, meetsTarget, daysBetween, slaState, rankExceptions, ControlTowerService } from './control-tower.service';
import type { ControlTowerException } from '@aec/api-contracts';

describe('computeAttainment', () => {
  it('MIN: value/target (lebih besar lebih baik)', () => {
    expect(computeAttainment(18_000, 15_000, 'MIN')).toBe(120);
  });

  it('MAX: target/value (lebih kecil lebih baik)', () => {
    expect(computeAttainment(60, 45, 'MAX')).toBe(75);
  });

  it('MAX: value 0 dianggap sempurna (100)', () => {
    expect(computeAttainment(0, 45, 'MAX')).toBe(100);
  });

  it('clamps a ceiling ratio so tiny values do not explode', () => {
    // 45/3 = 1500% → dibatasi 200%.
    expect(computeAttainment(3, 45, 'MAX')).toBe(200);
  });

  it('returns null when target is null', () => {
    expect(computeAttainment(100, null, 'MIN')).toBeNull();
  });

  it('returns null when target is zero (no divide-by-zero)', () => {
    expect(computeAttainment(100, 0, 'MAX')).toBeNull();
  });
});

describe('meetsTarget', () => {
  it('MIN: value at or above target meets it', () => {
    expect(meetsTarget(15_000, 15_000, 'MIN')).toBe(true);
    expect(meetsTarget(14_999, 15_000, 'MIN')).toBe(false);
  });

  it('MAX: value at or below target meets it', () => {
    expect(meetsTarget(45, 45, 'MAX')).toBe(true);
    expect(meetsTarget(46, 45, 'MAX')).toBe(false);
  });

  it('returns null when no target', () => {
    expect(meetsTarget(10, null, 'MIN')).toBeNull();
  });
});

describe('daysBetween', () => {
  it('counts whole days and never goes negative', () => {
    const a = new Date('2026-01-01T00:00:00Z');
    const b = new Date('2026-01-08T00:00:00Z');
    expect(daysBetween(a, b)).toBe(7);
    expect(daysBetween(b, a)).toBe(0);
  });
});

describe('slaState', () => {
  const now = new Date('2026-01-20T00:00:00Z');

  it('reports age, sla and overdue when past due', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const due = new Date('2026-01-08T00:00:00Z');
    const s = slaState(created, due, now);
    expect(s.ageDays).toBe(19);
    expect(s.slaDays).toBe(7);
    expect(s.overdue).toBe(true);
  });

  it('not overdue when due is in the future', () => {
    const created = new Date('2026-01-18T00:00:00Z');
    const due = new Date('2026-01-25T00:00:00Z');
    const s = slaState(created, due, now);
    expect(s.overdue).toBe(false);
    expect(s.slaDays).toBe(7);
  });

  it('no SLA when dueAt is null', () => {
    const s = slaState(new Date('2026-01-01T00:00:00Z'), null, now);
    expect(s.slaDays).toBeNull();
    expect(s.overdue).toBe(false);
  });
});

describe('rankExceptions', () => {
  const mk = (severity: ControlTowerException['severity'], ageDays: number, overdue: boolean): ControlTowerException => ({
    key: `${severity}-${ageDays}-${overdue}`,
    severity,
    type: 'x',
    documentCode: null,
    domain: 'd',
    ageDays,
    slaDays: 7,
    overdue,
    to: '/',
  });

  it('orders by severity, then overdue, then age', () => {
    const input = [mk('LOW', 30, true), mk('HIGH', 2, false), mk('HIGH', 9, true), mk('MEDIUM', 5, true)];
    const out = rankExceptions(input).map((e) => `${e.severity}:${e.ageDays}`);
    expect(out).toEqual(['HIGH:9', 'HIGH:2', 'MEDIUM:5', 'LOW:30']);
  });

  it('does not mutate the input array', () => {
    const input = [mk('LOW', 1, false), mk('HIGH', 2, false)];
    const copy = [...input];
    rankExceptions(input);
    expect(input).toEqual(copy);
  });
});

/**
 * Test integrasi service dengan Prisma tiruan. Fokus: bentuk keluaran selalu
 * valid (array/objek kosong, bukan null) dan target benar-benar dipakai.
 */
describe('ControlTowerService (shape)', () => {
  function makePrisma() {
    const empty = { findMany: async () => [], count: async () => 0, aggregate: async () => ({ _sum: {}, _count: { _all: 0 } }), groupBy: async () => [], findFirst: async () => null };
    return {
      project: { ...empty, findMany: async () => [] },
      budgetItem: { ...empty, groupBy: async () => [] },
      vendorInvoice: { ...empty, groupBy: async () => [] },
      clientInvoice: { ...empty, groupBy: async () => [] },
      risk: { ...empty, groupBy: async () => [], findMany: async () => [] },
      kpiTarget: { ...empty, findMany: async () => [{ metric: 'cash.min', target: 15000000000, direction: 'MIN', legalEntityId: 'LE1' }] },
      approvalTask: { ...empty, findMany: async () => [] },
      ncr: { ...empty, findMany: async () => [], count: async () => 0 },
      hseIncident: { ...empty, findMany: async () => [], count: async () => 0 },
      correctiveAction: { ...empty, findMany: async () => [], count: async () => 0 },
      bankGuarantee: { ...empty, findMany: async () => [], count: async () => 0 },
      cashPosition: { ...empty, findMany: async () => [] },
      fxExposure: { ...empty, findMany: async () => [] },
      fiscalPeriod: { ...empty, findFirst: async () => null },
      purchaseOrder: { ...empty, findMany: async () => [] },
      purchaseRequisition: { ...empty, count: async () => 0 },
      rfq: { ...empty, count: async () => 0 },
      vendorPerformanceRating: { ...empty, findMany: async () => [] },
      employee: { ...empty, count: async () => 0 },
      timesheet: { ...empty, count: async () => 0 },
      constructionDailyReport: { ...empty, findMany: async () => [] },
      equipmentUtilization: { ...empty, findMany: async () => [] },
      equipmentBreakdown: { ...empty, count: async () => 0 },
      punchListItem: { ...empty, count: async () => 0 },
      auditFinding: { ...empty, count: async () => 0 },
      legalCase: { ...empty, count: async () => 0 },
      opportunity: { ...empty, findMany: async () => [], aggregate: async () => ({ _sum: { expectedValue: 0 }, _count: { _all: 0 } }) },
      tenderSubmission: { ...empty, count: async () => 0 },
      projectVariation: { ...empty, aggregate: async () => ({ _sum: { amountChange: 0 } }) },
    };
  }

  function makeService() {
    const cache = { wrap: async (_k: string, _t: number, fn: () => Promise<unknown>) => fn() };
    const prisma = makePrisma();
    const executive = { executive: async () => ({ projects: { total: 0, byStatus: {}, totalContractValue: 0, totalAdvance: 0 }, finance: { totalBudget: 0, postedVendorInvoice: 0, postedClientInvoice: 0, cashIn: 0, cashOut: 0 }, operational: { openClaims: 0, openNcrs: 0, openIncidents: 0, overduePm: 0, openPunchItems: 0 }, generatedAt: new Date().toISOString() }) };
    const financial = {
      cashFlow: async () => ({ series: [], totalCashIn: 0, totalCashOut: 0, netCash: 0, generatedAt: new Date().toISOString() }),
      aging: async () => ({ ar: [], ap: [], asOf: new Date().toISOString(), basisDate: 'invoiceDate', generatedAt: new Date().toISOString() }),
    };
    return new ControlTowerService(prisma as never, cache as never, executive as never, financial as never);
  }

  it('returns a valid shape even with zero data (arrays, not null)', async () => {
    const svc = makeService();
    const out = await svc.controlTower({});
    expect(out.kpis).toHaveLength(8);
    expect(out.exceptions.items).toEqual([]);
    expect(out.exceptions.bySeverity).toEqual({ HIGH: 0, MEDIUM: 0, LOW: 0 });
    expect(out.projects).toEqual([]);
    expect(out.operations.procurement.openPoValue).toBe(0);
    expect(out.operations.safety.openIncidents).toBe(0);
    expect(out.governance.riskMatrix).toEqual([]);
    expect(out.commercial.funnel).toHaveLength(5);
    expect(out.treasury.cashOnHand).toBe(0);
    expect(typeof out.generatedAt).toBe('string');
  });

  it('applies the KPI target to the cash metric', async () => {
    const svc = makeService();
    const out = await svc.controlTower({ legalEntityId: 'LE1' });
    const cash = out.kpis.find((k) => k.key === 'cash');
    expect(cash?.target).toBe(15000000000);
    expect(cash?.direction).toBe('MIN');
  });
});
