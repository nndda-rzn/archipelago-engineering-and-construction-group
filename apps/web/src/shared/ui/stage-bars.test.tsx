import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StageBars } from '@aec/ui';

describe('StageBars', () => {
  it('renders one labelled bar per stage in order', () => {
    render(<StageBars stages={[{ stage: 'LEAD', count: 5, value: 100 }, { stage: 'WON', count: 1, value: 20 }]} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByText('LEAD')).toBeTruthy();
    expect(screen.getByText('WON')).toBeTruthy();
  });

  it('still renders a zero-count stage', () => {
    render(<StageBars stages={[{ stage: 'PROPOSAL', count: 0, value: 0 }]} />);
    expect(screen.getByText('PROPOSAL')).toBeTruthy();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('scales each bar against the largest stage value', () => {
    const { container } = render(
      <StageBars stages={[{ stage: 'LEAD', count: 5, value: 100 }, { stage: 'WON', count: 1, value: 50 }]} />,
    );
    const fills = Array.from(container.querySelectorAll('[data-slot="stage-fill"]'));
    expect(fills[0]?.getAttribute('style')).toContain('100%');
    expect(fills[1]?.getAttribute('style')).toContain('50%');
  });

  it('does not divide by zero when every stage value is zero', () => {
    const { container } = render(<StageBars stages={[{ stage: 'LEAD', count: 0, value: 0 }]} />);
    const fill = container.querySelector('[data-slot="stage-fill"]');
    expect(fill?.getAttribute('style')).toContain('0%');
  });
});
