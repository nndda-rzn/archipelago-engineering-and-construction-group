import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgingStackedBar } from './aging-stacked-bar';

describe('AgingStackedBar', () => {
  it('renders an accessible label with the buckets', () => {
    render(<AgingStackedBar buckets={[{ bucket: 'CURRENT', amount: 100 }, { bucket: '90+', amount: 50 }]} label="AR" />);
    expect(screen.getByRole('img', { name: /AR/ }).getAttribute('aria-label')).toContain('CURRENT');
  });
  it('shows an empty message when all buckets are zero', () => {
    render(<AgingStackedBar buckets={[{ bucket: 'CURRENT', amount: 0 }]} label="AR" />);
    expect(screen.getByText(/no outstanding/i)).toBeTruthy();
  });
  it('renders a legend with each bucket label', () => {
    render(<AgingStackedBar buckets={[{ bucket: 'CURRENT', amount: 100 }, { bucket: '90+', amount: 50 }]} label="AR" />);
    expect(screen.getByText('CURRENT')).toBeTruthy();
    expect(screen.getByText('90+')).toBeTruthy();
  });
});
