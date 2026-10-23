import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyPosition } from './money-position';

const base = {
  revised: 1_000_000_000,
  committed: 100_000_000,
  actual: 400_000_000,
  eac: 1_100_000_000,
  baseline: 900_000_000,
};

describe('MoneyPosition', () => {
  it('shows the revised total as the dominant figure', () => {
    render(<MoneyPosition {...base} />);
    expect(screen.getByTestId('money-revised').textContent).toMatch(/Rp 1 M/);
  });

  it('splits the bar into actual, committed and remaining', () => {
    render(<MoneyPosition {...base} />);
    expect(screen.getByTestId('segment-actual').getAttribute('style')).toContain('width: 40%');
    expect(screen.getByTestId('segment-committed').getAttribute('style')).toContain('width: 10%');
    expect(screen.getByTestId('segment-remaining').getAttribute('style')).toContain('width: 50%');
  });

  it('labels the percentages inside the bar so the split reads without a legend', () => {
    render(<MoneyPosition {...base} />);
    const bar = screen.getByTestId('money-bar');
    expect(bar.textContent).toMatch(/40%/);
    expect(bar.textContent).toMatch(/10%/);
    expect(bar.textContent).toMatch(/50%/);
  });

  it('marks EAC beyond the bar when the forecast overshoots', () => {
    render(<MoneyPosition {...base} />);
    const marker = screen.getByTestId('eac-marker');
    expect(marker.getAttribute('data-overflow')).toBe('true');
    expect(marker.textContent).toMatch(/EAC/);
  });

  it('keeps the marker inside the bar when the forecast is within budget', () => {
    render(<MoneyPosition {...base} eac={800_000_000} />);
    expect(screen.getByTestId('eac-marker').getAttribute('data-overflow')).toBe('false');
  });

  it('omits the marker entirely when there is no forecast', () => {
    render(<MoneyPosition {...base} eac={null} />);
    expect(screen.queryByTestId('eac-marker')).toBeNull();
  });

  it('shows the drift from baseline to revised', () => {
    render(<MoneyPosition {...base} />);
    expect(screen.getByTestId('drift').textContent).toMatch(/\+Rp 100 jt/);
  });

  it('states drift 0 plainly when the revision did not move the total', () => {
    render(<MoneyPosition {...base} baseline={1_000_000_000} />);
    expect(screen.getByTestId('drift').textContent).toMatch(/drift 0/);
  });

  it('explains that actual is limited to the WBS that received cost', () => {
    render(<MoneyPosition {...base} />);
    expect(screen.getByLabelText('Money position').textContent).toMatch(/material/i);
  });

  it('never divides by zero when there is no revised budget', () => {
    render(<MoneyPosition revised={0} committed={0} actual={0} eac={null} baseline={0} />);
    expect(screen.queryByTestId('segment-actual')).toBeNull();
    expect(screen.getByTestId('money-revised').textContent).toMatch(/Rp 0/);
  });

  it('describes the whole split for screen readers', () => {
    render(<MoneyPosition {...base} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/actual/i);
  });
});
