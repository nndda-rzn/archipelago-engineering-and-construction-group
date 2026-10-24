import { CommercialService } from './commercial.service';
import type { PrismaService } from '@/shared/database/prisma.service';
import type { AuditService } from '@/modules/foundation';

/**
 * Mock Prisma minimal untuk `getSummary()` — hanya model yang disentuh.
 */
function makePrisma(opts: {
  openOpps?: Array<{ stage: string; expectedValue: number }>;
  won?: { value: number; count: number };
  lost?: { value: number; count: number };
  contracts?: Array<{ status: string; value: number }>;
  clientCount?: number;
} = {}) {
  const openOpps = opts.openOpps ?? [];
  const won = opts.won ?? { value: 0, count: 0 };
  const lost = opts.lost ?? { value: 0, count: 0 };
  const contracts = opts.contracts ?? [];
  return {
    opportunity: {
      findMany: async ({ where }: { where: { status?: string; stage?: string } }) =>
        where.status === 'OPEN'
          ? openOpps.filter((o) => !where.stage || o.stage === where.stage)
          : [],
      aggregate: async ({ where }: { where: { status: string } }) =>
        where.status === 'CLOSED_WON'
          ? { _sum: { expectedValue: won.value }, _count: { _all: won.count } }
          : { _sum: { expectedValue: lost.value }, _count: { _all: lost.count } },
    },
    contract: {
      findMany: async () => contracts,
    },
    client: {
      count: async () => opts.clientCount ?? 0,
    },
  } as never;
}

function makeService(prisma: unknown): CommercialService {
  return new CommercialService(prisma as PrismaService, { record: async () => {} } as AuditService);
}

describe('CommercialService.getSummary', () => {
  it('zero data → shape valid: pipeline 0, win rate null, funnel 5 stage', async () => {
    const svc = makeService(makePrisma());
    const out = await svc.getSummary();
    expect(out.pipelineValue).toBe(0);
    expect(out.openOpportunities).toBe(0);
    expect(out.winRatePct).toBeNull();
    expect(out.wonValue).toBe(0);
    expect(out.lostValue).toBe(0);
    expect(out.funnel).toHaveLength(5);
    expect(out.funnel.map((f) => f.stage)).toEqual(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON']);
    expect(out.contractBook.executedValue).toBe(0);
    expect(out.contractBook.executedCount).toBe(0);
    expect(out.contractBook.draftValue).toBe(0);
    expect(out.contractBook.draftCount).toBe(0);
    expect(out.clients.total).toBe(0);
  });

  it('menghitung pipeline value & funnel per stage dari opp OPEN', async () => {
    const svc = makeService(
      makePrisma({
        openOpps: [
          { stage: 'LEAD', expectedValue: 100 },
          { stage: 'LEAD', expectedValue: 200 },
          { stage: 'PROPOSAL', expectedValue: 500 },
          { stage: 'WON', expectedValue: 1000 },
        ],
      }),
    );
    const out = await svc.getSummary();
    expect(out.pipelineValue).toBe(1800);
    expect(out.openOpportunities).toBe(4);
    const lead = out.funnel.find((f) => f.stage === 'LEAD');
    const proposal = out.funnel.find((f) => f.stage === 'PROPOSAL');
    const wonStage = out.funnel.find((f) => f.stage === 'WON');
    expect(lead).toMatchObject({ count: 2, value: 300 });
    expect(proposal).toMatchObject({ count: 1, value: 500 });
    expect(wonStage).toMatchObject({ count: 1, value: 1000 });
  });

  it('win rate = won/(won+lost) dalam persen, dibulatkan 1 desimal', async () => {
    const svc = makeService(makePrisma({ won: { value: 1200, count: 3 }, lost: { value: 900, count: 4 } }));
    const out = await svc.getSummary();
    expect(out.wonValue).toBe(1200);
    expect(out.lostValue).toBe(900);
    expect(out.winRatePct).toBe(42.9);
  });

  it('win rate null saat belum ada yang closed', async () => {
    const svc = makeService(makePrisma());
    expect((await svc.getSummary()).winRatePct).toBeNull();
  });

  it('contract book dipisah executed vs draft', async () => {
    const svc = makeService(
      makePrisma({
        contracts: [
          { status: 'EXECUTED', value: 4000 },
          { status: 'EXECUTED', value: 6000 },
          { status: 'DRAFT', value: 1000 },
        ],
      }),
    );
    const out = await svc.getSummary();
    expect(out.contractBook.executedValue).toBe(10000);
    expect(out.contractBook.executedCount).toBe(2);
    expect(out.contractBook.draftValue).toBe(1000);
    expect(out.contractBook.draftCount).toBe(1);
  });

  it('clients.total dari count', async () => {
    const svc = makeService(makePrisma({ clientCount: 7 }));
    expect((await svc.getSummary()).clients.total).toBe(7);
  });
});
