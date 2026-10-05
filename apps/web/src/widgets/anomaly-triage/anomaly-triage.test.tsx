import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { groupAnomalies, AnomalyTriageView } from './anomaly-triage';

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

describe('AnomalyTriageView', () => {
  it('keeps the calming all-clear message when there are no anomalies', () => {
    render(<AnomalyTriageView anomalies={[]} />);
    expect(screen.getByText(/no anomalies/i)).toBeTruthy();
    expect(screen.getByText(/nothing flagged/i)).toBeTruthy();
  });

  it('shows a shaped list skeleton while loading, not a bare "Loading…" string', () => {
    render(<AnomalyTriageView anomalies={[]} isLoading />);
    expect(screen.getByLabelText('Loading anomalies')).toBeTruthy();
    expect(screen.queryByText(/loading/i)).toBeNull();
  });
});
