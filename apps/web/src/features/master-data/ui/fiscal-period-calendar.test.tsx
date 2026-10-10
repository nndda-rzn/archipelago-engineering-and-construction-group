import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FiscalPeriod } from '@aec/api-contracts';
import { FiscalPeriodCalendar } from './fiscal-period-calendar';

const p = (month: number, status: string): FiscalPeriod => ({
  id: `p${month}`, periodCode: `2026-${String(month).padStart(2, '0')}`, periodYear: 2026, periodMonth: month,
  startDate: `2026-${String(month).padStart(2, '0')}-01`, endDate: `2026-${String(month).padStart(2, '0')}-28`,
  status, createdAt: 'x', updatedAt: 'x',
});

const periods = [p(1, 'LOCKED'), p(2, 'CLOSED'), p(3, 'OPEN'), p(4, 'SOFT_CLOSED'), p(5, 'FUTURE')];

describe('FiscalPeriodCalendar', () => {
  it('renders one tile per period with its month and status', () => {
    render(<FiscalPeriodCalendar periods={periods} onSelect={() => {}} />);
    expect(screen.getByText('2026-01')).toBeTruthy();
    expect(screen.getByText('2026-05')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('exposes the status on each tile for assistive tech', () => {
    render(<FiscalPeriodCalendar periods={periods} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /2026-03.*OPEN/i })).toBeTruthy();
  });

  it('calls onSelect with the period when a tile is clicked', () => {
    const onSelect = vi.fn();
    render(<FiscalPeriodCalendar periods={periods} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /2026-02/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ periodCode: '2026-02' }));
  });

  it('marks the selected period', () => {
    render(<FiscalPeriodCalendar periods={periods} selectedId="p3" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /2026-03/ }).getAttribute('aria-pressed')).toBe('true');
  });
});
