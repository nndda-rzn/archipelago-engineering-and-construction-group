import { describe, expect, it } from 'vitest';
import { groupAnomalies } from './anomaly-triage';

describe('groupAnomalies', () => {
  it('groups by severity in HIGH→MEDIUM→LOW order, dropping empty groups', () => {
    const groups = groupAnomalies([
      { type: 'A', severity: 'LOW', message: 'a' },
      { type: 'B', severity: 'HIGH', message: 'b' },
    ]);
    expect(groups.map((g) => g.severity)).toEqual(['HIGH', 'LOW']);
    expect(groups[0]!.items.length).toBe(1);
  });

  it('returns empty array for no anomalies', () => {
    expect(groupAnomalies([])).toEqual([]);
  });
});
