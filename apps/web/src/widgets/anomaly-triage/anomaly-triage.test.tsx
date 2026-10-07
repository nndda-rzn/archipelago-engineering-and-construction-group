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

  it('keeps HIGH anomalies visible and collapses MEDIUM/LOW', () => {
    const anomalies = [
      { type: 'NCR overdue', severity: 'HIGH' as const, message: 'high one' },
      { type: 'Incident open', severity: 'MEDIUM' as const, message: 'medium one' },
      { type: 'Claim DRAFT', severity: 'LOW' as const, message: 'low one' },
    ];
    render(<AnomalyTriageView anomalies={anomalies} />);
    expect(screen.getByText('high one')).toBeTruthy();
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('medium one')).toBeNull();
    expect(screen.queryByText('low one')).toBeNull();
  });

  it('caps the always-open HIGH group with a "+N more" line', () => {
    const anomalies = Array.from({ length: 11 }).map((_, i) => ({
      type: 'NCR overdue',
      severity: 'HIGH' as const,
      message: `high ${i}`,
    }));
    render(<AnomalyTriageView anomalies={anomalies} total={11} />);
    expect(screen.getByText('+3 more high-severity anomalies')).toBeTruthy();
  });
});
