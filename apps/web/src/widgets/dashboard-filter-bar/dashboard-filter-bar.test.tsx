import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardFilterBarView, activeFilters } from './dashboard-filter-bar';

describe('activeFilters', () => {
  it('lists only set filters', () => {
    const list = activeFilters({ period: 'YTD', entity: '', health: 'CRITICAL', bucket: '' });
    expect(list.map((f) => f.key)).toEqual(['health']);
  });
  it('includes entity and bucket when set', () => {
    const list = activeFilters({ period: '', entity: 'LE1', health: '', bucket: '90+' });
    expect(list.map((f) => f.key).sort()).toEqual(['bucket', 'entity']);
  });
  it('lists nothing when no filter is set', () => {
    expect(activeFilters({ period: 'YTD', entity: '', health: '', bucket: '' })).toEqual([]);
  });
});

describe('DashboardFilterBarView', () => {
  it('renders the period options and entity select', () => {
    render(
      <DashboardFilterBarView
        preset="YTD"
        onPresetChange={() => {}}
        entityId=""
        onEntityChange={() => {}}
        entities={[{ value: 'LE1', label: 'PT A' }]}
        onReload={() => {}}
        isLoading={false}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: /period/i })).toBeTruthy();
    expect(screen.getByText('YTD')).toBeTruthy();
  });
});
