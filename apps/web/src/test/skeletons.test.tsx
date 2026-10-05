import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartSkeleton, ListSkeleton } from '@aec/ui';

describe('ChartSkeleton', () => {
  it('renders a labelled loading region shaped like a chart', () => {
    const { container } = render(<ChartSkeleton />);
    expect(screen.getByLabelText('Loading chart')).toBeTruthy();
    // bar-shaped: several stub bars, not a single block
    expect(container.querySelectorAll('[data-slot="skeleton-bar"]').length).toBeGreaterThan(3);
  });
});

describe('ListSkeleton', () => {
  it('renders the requested number of placeholder rows', () => {
    const { container } = render(<ListSkeleton rows={3} />);
    expect(container.querySelectorAll('[data-slot="skeleton-row"]').length).toBe(3);
  });
});
