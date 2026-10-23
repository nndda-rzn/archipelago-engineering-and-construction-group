import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExceptionStrip } from './exception-strip';

const clean = {
  warnings: {
    overContract: false,
    overCommitted: [] as Array<{ wbsId: string; code: string; amount: number }>,
    noBudget: [] as Array<{ wbsId: string; code: string }>,
    pvCoverage: { pv: 100, bac: 100, status: 'COMPLETE' as const },
  },
  reconciliation: { ledgerOut: 100, journalExpense610: 0, doubleCountRisk: false },
};

describe('ExceptionStrip', () => {
  it('renders nothing when there is nothing to act on', () => {
    const { container } = render(<ExceptionStrip {...clean} />);
    expect(container.textContent).toBe('');
  });

  it('surfaces the double-count risk with both figures', () => {
    render(<ExceptionStrip {...clean} reconciliation={{ ledgerOut: 2_258_823_529_412, journalExpense610: 75_000_000_000, doubleCountRisk: true }} />);
    const strip = screen.getByRole('region', { name: /needs attention/i });
    expect(strip.textContent).toMatch(/double count/i);
    expect(strip.textContent).toMatch(/75 M/);
  });

  it('lists nodes without budget', () => {
    render(<ExceptionStrip {...clean} warnings={{ ...clean.warnings, noBudget: [{ wbsId: 'w', code: '1.1' }, { wbsId: 'x', code: '1.2' }] }} />);
    expect(screen.getByText(/1\.1, 1\.2/)).toBeTruthy();
  });

  it('lists nodes committed above budget', () => {
    render(<ExceptionStrip {...clean} warnings={{ ...clean.warnings, overCommitted: [{ wbsId: 'w', code: '2.1', amount: 50_000_000 }] }} />);
    expect(screen.getByText(/2\.1/)).toBeTruthy();
  });

  it('flags a revised total above the contract', () => {
    render(<ExceptionStrip {...clean} warnings={{ ...clean.warnings, overContract: true }} />);
    expect(screen.getByText(/contract value/i)).toBeTruthy();
  });

  it('explains a missing schedule baseline in plain language', () => {
    render(<ExceptionStrip {...clean} warnings={{ ...clean.warnings, pvCoverage: { pv: 0, bac: 100, status: 'NO_BASELINE' } }} />);
    expect(screen.getByText(/no schedule baseline/i)).toBeTruthy();
  });

  it('does not raise an alarm for PV below BAC — that is normal', () => {
    render(<ExceptionStrip {...clean} warnings={{ ...clean.warnings, pvCoverage: { pv: 60, bac: 100, status: 'COMPLETE' } }} />);
    const { container } = render(<ExceptionStrip {...clean} warnings={{ ...clean.warnings, pvCoverage: { pv: 60, bac: 100, status: 'COMPLETE' } }} />);
    expect(container.textContent).toBe('');
  });

  it('groups every exception under one labelled region', () => {
    render(
      <ExceptionStrip
        warnings={{ ...clean.warnings, overContract: true, noBudget: [{ wbsId: 'w', code: '9' }] }}
        reconciliation={{ ledgerOut: 10, journalExpense610: 5, doubleCountRisk: true }}
      />,
    );
    const strip = screen.getByRole('region', { name: /needs attention/i });
    expect(strip.querySelectorAll('li').length).toBeGreaterThanOrEqual(3);
  });
});
