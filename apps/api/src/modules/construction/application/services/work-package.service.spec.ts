import { WorkPackageService } from './work-package.service';

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    fail(`expected rejection with code ${code}`);
  } catch (e: unknown) {
    const anyE = e as { getResponse?: () => unknown; code?: string; message?: string };
    const body = anyE.getResponse?.() as { code?: string };
    const got = body?.code ?? anyE.code;
    expect(got).toBe(code);
  }
}

describe('WorkPackageService.start', () => {
  let service: WorkPackageService;
  const audit = { record: jest.fn() };

  interface PrismaMock {
    constructionWorkPackage: { findUnique: jest.Mock; update: jest.Mock; count: jest.Mock; findMany: jest.Mock };
    drawing: { count: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      constructionWorkPackage: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
      drawing: { count: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new WorkPackageService(prisma as never, audit as never);
  });

  const wp = (over: Record<string, unknown> = {}) => ({
    id: 'wp-1',
    wpNumber: 'WP-2026-EPC-000001',
    projectId: 'proj-1',
    status: 'DRAFT',
    requiresIFC: false,
    ...over,
  });

  it('WP tidak ditemukan -> NotFound WP_NOT_FOUND', async () => {
    prisma.constructionWorkPackage.findUnique.mockResolvedValue(null);
    await expectCode(service.start('wp-1', 'user-1'), 'WP_NOT_FOUND');
  });

  it('status bukan DRAFT -> Conflict WP_NOT_DRAFT', async () => {
    prisma.constructionWorkPackage.findUnique.mockResolvedValue(wp({ status: 'IN_PROGRESS' }));
    await expectCode(service.start('wp-1', 'user-1'), 'WP_NOT_DRAFT');
  });

  it('requiresIFC tanpa IFC -> Conflict READINESS_GATE_BLOCKED, TANPA menulis (no write-then-throw)', async () => {
    prisma.constructionWorkPackage.findUnique.mockResolvedValue(wp({ requiresIFC: true }));
    prisma.drawing.count.mockResolvedValue(0);

    await expectCode(service.start('wp-1', 'user-1'), 'READINESS_GATE_BLOCKED');

    expect(prisma.constructionWorkPackage.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('tanpa requiresIFC -> set IN_PROGRESS + readyStatus READY, audit tercatat', async () => {
    prisma.constructionWorkPackage.findUnique.mockResolvedValue(wp({ requiresIFC: false }));
    prisma.constructionWorkPackage.update.mockResolvedValue({ id: 'wp-1', status: 'IN_PROGRESS', readyStatus: 'READY' });

    const result = await service.start('wp-1', 'user-1');

    expect(prisma.drawing.count).not.toHaveBeenCalled();
    expect(prisma.constructionWorkPackage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wp-1' },
        data: expect.objectContaining({ status: 'IN_PROGRESS', readyStatus: 'READY' }),
      }),
    );
    expect(result.status).toBe('IN_PROGRESS');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'WorkPackage.START' }));
  });

  it('requiresIFC dengan IFC tersedia -> start sukses', async () => {
    prisma.constructionWorkPackage.findUnique.mockResolvedValue(wp({ requiresIFC: true }));
    prisma.drawing.count.mockResolvedValue(2);
    prisma.constructionWorkPackage.update.mockResolvedValue({ id: 'wp-1', status: 'IN_PROGRESS', readyStatus: 'READY' });

    const result = await service.start('wp-1', 'user-1');

    expect(prisma.drawing.count).toHaveBeenCalledWith({ where: { projectId: 'proj-1', isIFC: true } });
    expect(prisma.constructionWorkPackage.update).toHaveBeenCalled();
    expect(result.status).toBe('IN_PROGRESS');
  });
});
