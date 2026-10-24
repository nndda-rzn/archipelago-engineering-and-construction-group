import { mapDomain, mapPoints, placePoints, worstPoint } from './health-map-domain';

const item = (id: string, cpi: number | null, spi: number | null, contractValue = 1e12) => ({
  projectId: id,
  code: id,
  cpi,
  spi,
  contractValue,
  health: 'AT_RISK',
});

describe('mapDomain', () => {
  it('covers SPI values below the old hardcoded floor of 0.5', () => {
    const d = mapDomain([item('a', 0.85, 0.38)]);
    expect(d.yMin).toBeLessThanOrEqual(0.38);
  });

  it('always keeps the 1.00 threshold inside the domain', () => {
    const d = mapDomain([item('a', 0.85, 0.38)]);
    expect(d.yMin).toBeLessThan(1);
    expect(d.yMax).toBeGreaterThanOrEqual(1);
    const d2 = mapDomain([item('a', 1.1, 1.15)]);
    expect(d2.yMax).toBeGreaterThanOrEqual(1.15);
  });

  it('clamps the domain to a sane floor and ceiling', () => {
    const d = mapDomain([item('a', 0.2, 0.1)]);
    expect(d.xMin).toBeGreaterThanOrEqual(0.3);
    expect(d.yMin).toBeGreaterThanOrEqual(0.3);
    const d2 = mapDomain([item('a', 2, 2)]);
    expect(d2.xMax).toBeLessThanOrEqual(1.35);
    expect(d2.yMax).toBeLessThanOrEqual(1.35);
  });

  it('is finite for an empty portfolio', () => {
    const d = mapDomain([]);
    expect(Number.isFinite(d.yMin)).toBe(true);
    expect(Number.isFinite(d.yMax)).toBe(true);
    expect(d.yMax).toBeGreaterThan(d.yMin);
  });
});

describe('mapPoints + placePoints', () => {
  it('draws one point per project with a CPI, inside the viewBox, whatever the SPI', () => {
    const items = [item('a', 1.1, 0.62), item('b', 0.85, 0.38), item('c', 0.93, 0.45)];
    const points = placePoints(mapPoints(items), mapDomain(items));
    expect(points.filter((p) => !p.noSpi)).toHaveLength(3);
    for (const p of points) {
      expect(p.ny).toBeGreaterThanOrEqual(0);
      expect(p.ny).toBeLessThanOrEqual(1);
      expect(p.nx).toBeGreaterThanOrEqual(0);
      expect(p.nx).toBeLessThanOrEqual(1);
    }
  });

  it('clusters projects sharing the same CPI×SPI into one point', () => {
    const items = [item('a', 0.85, 0.38), item('b', 0.85, 0.38), item('c', 0.85, 0.38)];
    const points = mapPoints(items);
    expect(points).toHaveLength(1);
    expect(points[0]!.items).toHaveLength(3);
  });

  it('routes projects without SPI to the bottom rail (ny = 1)', () => {
    const items = [item('a', 0.93, null)];
    const points = placePoints(mapPoints(items), mapDomain(items));
    const rail = points.find((p) => p.noSpi);
    expect(rail).toBeDefined();
    expect(rail!.ny).toBe(1);
  });

  it('skips projects without a CPI entirely (NO_BUDGET)', () => {
    expect(mapPoints([item('a', null, null)])).toHaveLength(0);
  });

  it('separates the worst point from the threshold line', () => {
    // SPI 0.38 dan ambang 1.0 tidak boleh menumpuk di posisi yang sama.
    const items = [item('a', 0.85, 0.38)];
    const domain = mapDomain(items);
    const points = placePoints(mapPoints(items), domain);
    const nyThreshold = (domain.yMax - 1) / (domain.yMax - domain.yMin);
    expect(points[0]!.ny).not.toBeCloseTo(nyThreshold, 3);
  });
});

describe('worstPoint', () => {
  it('returns the lowest plotted SPI for bottom-label placement', () => {
    const items = [item('a', 1.1, 0.62), item('b', 0.85, 0.38)];
    const points = placePoints(mapPoints(items), mapDomain(items));
    expect(worstPoint(points)!.items[0]!.code).toBe('b');
  });

  it('returns null when nothing is plotted', () => {
    expect(worstPoint([])).toBeNull();
  });
});
