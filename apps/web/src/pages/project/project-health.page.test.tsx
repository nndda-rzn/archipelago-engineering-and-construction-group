import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({ project: 'p2' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('@/entities/project', () => ({
  useProjects: () => ({ data: { items: [{ id: 'p1', code: 'A', name: 'A' }, { id: 'p2', code: 'B', name: 'B' }] } }),
}));
vi.mock('@/features/project', () => ({
  useProjectHealth: (id: string) => ({
    data: id === 'p2' ? { projectId: 'p2' } : undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/features/project/ui', () => ({
  HealthSummary: () => <div>summary</div>,
  HealthTable: () => <div>table</div>,
}));

describe('ProjectHealthPage', () => {
  it('preselects the project from the URL param', async () => {
    const { ProjectHealthPage } = await import('./project-health.page');
    render(<ProjectHealthPage />);
    expect(await screen.findByText('summary')).toBeTruthy();
  });
});
