import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DivergingBar } from '@aec/ui';

describe('DivergingBar', () => {
  it('exposes both magnitudes in the accessible label', () => {
    render(
      <DivergingBar left={4100} right={2600} leftLabel="AP" rightLabel="AR" format={(n) => String(n)} />,
    );
    expect(screen.getByRole('img', { name: /AP 4100/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /AR 2600/ })).toBeTruthy();
  });

  it('renders a zero baseline between the two directions', () => {
    const { container } = render(<DivergingBar left={100} right={50} leftLabel="AP" rightLabel="AR" />);
    expect(container.querySelector('[data-slot="diverging-zero"]')).toBeTruthy();
  });

  it('does not divide by zero when both sides are zero', () => {
    const { container } = render(<DivergingBar left={0} right={0} leftLabel="AP" rightLabel="AR" />);
    for (const b of container.querySelectorAll('[data-slot="diverging-fill"]')) {
      expect((b as HTMLElement).style.width).toBe('0%');
    }
  });

  it('scales each side relative to the larger magnitude', () => {
    const { container } = render(<DivergingBar left={100} right={50} leftLabel="AP" rightLabel="AR" />);
    const fills = container.querySelectorAll('[data-slot="diverging-fill"]');
    expect((fills[0] as HTMLElement).style.width).toBe('100%');
    expect((fills[1] as HTMLElement).style.width).toBe('50%');
  });
});
