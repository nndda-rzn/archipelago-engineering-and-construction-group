import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader, ScopeChip } from './page-header';

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    render(<PageHeader title="Dashboard · Control Tower" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard · Control Tower' })).toBeTruthy();
  });

  it('renders subtitle, scope and actions', () => {
    render(
      <PageHeader
        title="Dashboard"
        subtitle="Portfolio command center"
        scope={<ScopeChip mono>FY2026 · Q1</ScopeChip>}
        actions={<button type="button">Export</button>}
      />,
    );
    expect(screen.getByText('Portfolio command center')).toBeTruthy();
    expect(screen.getByText('FY2026 · Q1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
  });

  it('omits optional parts when not provided', () => {
    const { container } = render(<PageHeader title="Only title" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});
