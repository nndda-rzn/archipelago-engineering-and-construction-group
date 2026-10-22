import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetWarnings } from './budget-status';

const warnings = (over: Record<string, unknown> = {}) => ({
  overContract: false,
  overCommitted: [] as Array<{ wbsId: string; code: string; amount: number }>,
  noBudget: [] as Array<{ wbsId: string; code: string }>,
  pvCoverage: { pv: 0, bac: 0, status: 'NO_BASELINE' as 'NO_BASELINE' | 'PARTIAL' | 'COMPLETE' },
  ...over,
});

const clean = { ledgerOut: 0, journalExpense610: 0, doubleCountRisk: false };

describe('BudgetWarnings', () => {
  it('explains that PV=0 means no schedule baseline', () => {
    render(<BudgetWarnings warnings={warnings()} reconciliation={clean} />);
    expect(screen.getByText(/no schedule baseline/i)).toBeTruthy();
  });

  it('does not warn when PV is below BAC', () => {
    render(
      <BudgetWarnings
        warnings={warnings({ pvCoverage: { pv: 600, bac: 1000, status: 'COMPLETE' } })}
        reconciliation={clean}
      />,
    );
    expect(screen.queryByText(/baseline PV is/i)).toBeNull();
  });

  it('surfaces the double-count risk in plain language', () => {
    render(
      <BudgetWarnings
        warnings={warnings()}
        reconciliation={{ ledgerOut: 100, journalExpense610: 50, doubleCountRisk: true }}
      />,
    );
    expect(screen.getByText(/double count/i)).toBeTruthy();
  });

  it('renders nothing when everything is in order', () => {
    const { container } = render(
      <BudgetWarnings
        warnings={warnings({ pvCoverage: { pv: 600, bac: 1000, status: 'COMPLETE' } })}
        reconciliation={{ ledgerOut: 100, journalExpense610: 0, doubleCountRisk: false }}
      />,
    );
    expect(container.textContent).toBe('');
  });

  it('lists leaves that were committed above their revised budget', () => {
    render(
      <BudgetWarnings
        warnings={warnings({ overCommitted: [{ wbsId: 'w', code: '2.1', amount: 50 }] })}
        reconciliation={clean}
      />,
    );
    expect(screen.getByText(/2\.1/)).toBeTruthy();
  });
});
