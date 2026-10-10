import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ProjectCostSummaryItem } from '@aec/api-contracts';
import { ProjectCostTable } from './project-cost-table';

const item = (over: Partial<ProjectCostSummaryItem>): ProjectCostSummaryItem => ({
  projectCode: 'PRJ-1',
  projectName: 'Tower',
  contractValue: 100,
  budget: 100,
  cost: 96,
  revenue: 10,
  margin: -86,
  budgetUsagePct: 96,
  ...over,
});

describe('ProjectCostTable', () => {
  it('renders the in-cell budget usage bar (no separate bar row above the table)', () => {
    const { container } = render(<ProjectCostTable items={[item({})]} />);
    expect(container.querySelector('[data-slot="budget-usage-fill"]')).toBeTruthy();
  });

  it('filters rows by search query', () => {
    render(
      <ProjectCostTable
        items={[item({ projectCode: 'PRJ-AAA', projectName: 'Alpha' }), item({ projectCode: 'PRJ-BBB', projectName: 'Beta' })]}
      />,
    );
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: 'beta' } });
    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('sorts by a numeric column when its header is clicked', () => {
    render(
      <ProjectCostTable
        items={[item({ projectCode: 'LOW', budgetUsagePct: 10 }), item({ projectCode: 'HIGH', budgetUsagePct: 99 })]}
      />,
    );
    // Default: budgetUsagePct desc → HIGH first.
    const rowsDesc = screen.getAllByRole('row').slice(1);
    expect(within(rowsDesc[0]!).getByText('HIGH')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Sort by Budget used/i }));
    const rowsAsc = screen.getAllByRole('row').slice(1);
    expect(within(rowsAsc[0]!).getByText('LOW')).toBeTruthy();
  });

  it('paginates when there are more rows than the page size', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      item({ projectCode: `PRJ-${i}`, projectName: `Project ${i}` }),
    );
    render(<ProjectCostTable items={many} />);
    // 8 per halaman → baris ke-9 tidak tampil.
    expect(screen.queryByText('Project 11')).toBeNull();
    expect(screen.getByText(/Page 1 of 2/i)).toBeTruthy();
  });
});
