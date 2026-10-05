import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardFilterBarView } from './dashboard-filter-bar';

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
