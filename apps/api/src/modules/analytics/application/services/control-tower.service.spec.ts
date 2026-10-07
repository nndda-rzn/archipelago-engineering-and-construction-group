import { computeAttainment, meetsTarget, daysBetween, slaState, rankExceptions } from './control-tower.service';
import type { ControlTowerException } from '@aec/api-contracts';

describe('computeAttainment', () => {
  it('MIN: value/target (lebih besar lebih baik)', () => {
    expect(computeAttainment(18_000, 15_000, 'MIN')).toBe(120);
  });

  it('MAX: target/value (lebih kecil lebih baik)', () => {
    expect(computeAttainment(60, 45, 'MAX')).toBe(75);
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
