import { describe, expect, it } from 'vitest';
import { portfolioEvmSchema } from '@aec/api-contracts';

describe('portfolioEvmSchema', () => {
  it('accepts a project with full EVM data', () => {
    const parsed = portfolioEvmSchema.parse({
      items: [
        { projectId: 'p1', projectCode: 'A', projectName: 'A', bac: 100, ev: 50, pv: 60, ac: 40, cpi: 1.25, spi: 0.83, eac: 80, vac: 20, tcpi: 1.1, progressPercent: 50, hasEvm: true },
      ],
      totals: { bac: 100, ev: 50, pv: 60, ac: 40, cpi: 1.25, spi: 0.83, eac: 80, vac: 20 },
      generatedAt: '2026-10-05T00:00:00.000Z',
    });
    expect(parsed.items[0]!.hasEvm).toBe(true);
  });

  it('accepts null cpi/spi/tcpi for a project without EVM data', () => {
    const parsed = portfolioEvmSchema.parse({
      items: [
        { projectId: 'p2', projectCode: 'B', projectName: 'B', bac: 0, ev: 0, pv: 0, ac: 0, cpi: null, spi: null, eac: 0, vac: 0, tcpi: null, progressPercent: 0, hasEvm: false },
      ],
      totals: { bac: 0, ev: 0, pv: 0, ac: 0, cpi: null, spi: null, eac: 0, vac: 0 },
      generatedAt: '2026-10-05T00:00:00.000Z',
    });
    expect(parsed.items[0]!.cpi).toBeNull();
  });
});
