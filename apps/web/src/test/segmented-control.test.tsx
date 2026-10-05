import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SegmentedControl } from '@aec/ui';

const OPTIONS = [
  { value: 'MTD', label: 'MTD' },
  { value: 'QTD', label: 'QTD' },
  { value: 'YTD', label: 'YTD' },
];

describe('SegmentedControl', () => {
  it('exposes a radiogroup with the checked option', () => {
    render(<SegmentedControl aria-label="Period" options={OPTIONS} value="QTD" onValueChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Period' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'QTD' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'MTD' }).getAttribute('aria-checked')).toBe('false');
  });

  it('marks the selected option neutral, never racing-red (red means attention, not selection)', () => {
    render(<SegmentedControl aria-label="Period" options={OPTIONS} value="QTD" onValueChange={() => {}} />);
    const selected = screen.getByRole('radio', { name: 'QTD' });
    expect(selected.className).toContain('bg-neutral-800');
    expect(selected.className).not.toContain('racing-red');
  });

  it('selects on click', () => {
    const onChange = vi.fn();
    render(<SegmentedControl aria-label="Period" options={OPTIONS} value="MTD" onValueChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'YTD' }));
    expect(onChange).toHaveBeenCalledWith('YTD');
  });

  it('moves selection with arrow keys', () => {
    const onChange = vi.fn();
    render(<SegmentedControl aria-label="Period" options={OPTIONS} value="MTD" onValueChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'MTD' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('QTD');
  });
});
