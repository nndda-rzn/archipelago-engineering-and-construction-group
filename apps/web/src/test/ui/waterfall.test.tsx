import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Waterfall, waterfallSegments, type WaterfallInput } from '@aec/ui';

const input: WaterfallInput = { contract: 100, budget: 80, actual: 60 };

describe('waterfallSegments', () => {
  it('builds Contract -> Budget -> Actual -> Variance with signed deltas', () => {
    const segs = waterfallSegments(input);
    expect(segs.map((s) => s.label)).toEqual(['Contract', 'Budget', 'Actual', 'Variance']);
    // Contract & Actual adalah nilai absolut; Budget adalah selisih dari Contract.
    expect(segs[0]!.value).toBe(100);
    expect(segs[1]!.value).toBe(-20); // Contract -> Budget turun 20
    expect(segs[2]!.value).toBe(-20); // Budget -> Actual turun 20
    expect(segs[3]!.value).toBe(20); // Actual -> Variance (sisa) naik 20
  });

  it('marks the running start/end of each segment so bars can be positioned', () => {
    const segs = waterfallSegments(input);
    expect(segs[0]!.start).toBe(0);
    expect(segs[0]!.end).toBe(100);
    expect(segs[1]!.start).toBe(100);
    expect(segs[1]!.end).toBe(80);
    expect(segs[3]!.start).toBe(60);
    expect(segs[3]!.end).toBe(80);
  });

  it('handles over-budget (actual > budget) without negative widths', () => {
    const segs = waterfallSegments({ contract: 100, budget: 80, actual: 95 });
    for (const s of segs) {
      expect(s.end).toBeGreaterThanOrEqual(0);
    }
    expect(segs.find((s) => s.label === 'Variance')!.value).toBe(-15);
  });

  it('returns zeroed segments when there is no contract/budget (no divide-by-zero)', () => {
    const segs = waterfallSegments({ contract: 0, budget: 0, actual: 0 });
    expect(segs.every((s) => Number.isFinite(s.start) && Number.isFinite(s.end))).toBe(true);
  });
});

describe('Waterfall', () => {
  it('renders an accessible figure describing the bridge', () => {
    render(<Waterfall {...input} />);
    const fig = screen.getByRole('img');
    expect(fig.getAttribute('aria-label')).toMatch(/Contract/i);
    expect(fig.getAttribute('aria-label')).toMatch(/Variance/i);
  });

  it('shows each stage label', () => {
    render(<Waterfall {...input} />);
    for (const label of ['Contract', 'Budget', 'Actual', 'Variance']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('marks the variance bar with a signed direction for colouring', () => {
    const { container } = render(<Waterfall {...input} />);
    const bars = container.querySelectorAll('[data-slot="waterfall-bar"]');
    expect(bars.length).toBe(4);
    // segmen terakhir (Variance) positif -> penanda up
    expect(bars[3]!.getAttribute('data-direction')).toBe('up');
  });
});
