import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShieldCheck } from 'lucide-react';
import { EmptyState } from '@aec/ui';

describe('EmptyState', () => {
  it('renders title and description by default', () => {
    render(<EmptyState title="No anomalies" description="Nothing flagged." />);
    expect(screen.getByText('No anomalies')).toBeTruthy();
    expect(screen.getByText('Nothing flagged.')).toBeTruthy();
  });

  it('uses a success tone badge when tone is success', () => {
    const { container } = render(<EmptyState title="All clear" tone="success" />);
    expect(container.querySelector('[data-slot="empty-icon"]')?.className).toContain('bg-success-50');
  });

  it('renders a custom icon', () => {
    const { container } = render(<EmptyState title="All clear" icon={<ShieldCheck data-testid="calm" />} />);
    expect(container.querySelector('[data-testid="calm"]')).toBeTruthy();
  });

  it('defaults to a neutral tone badge', () => {
    const { container } = render(<EmptyState title="No data" />);
    expect(container.querySelector('[data-slot="empty-icon"]')?.className).toContain('bg-neutral-100');
  });
});
