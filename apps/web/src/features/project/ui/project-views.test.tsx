import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ProjectRegisterItem } from '@aec/api-contracts';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...rest }: { children: React.ReactNode; to: string; params?: Record<string, string> }) => {
    let href = to;
    if (params) for (const [k, v] of Object.entries(params)) href = href.replace(`$${k}`, String(v));
    return <a href={href} {...rest}>{children}</a>;
  },
}));

import { ProjectCardView, urgencyGroup } from './project-views';

const base: ProjectRegisterItem = {
  projectId: 'p1', code: 'PRJ-01', name: 'Alpha EPC', client: 'PT Klien', manager: 'Andi',
  managerRef: { id: 'e1', name: 'Andi Pratama', position: 'PM' }, directorRef: null,
  status: 'ACTIVE', type: 'EPC', priority: 'HIGH', phase: 'CONSTRUCTION', healthStatus: 'AT_RISK',
  tagline: 'EPC fasilitas pengolahan', isWatchlist: true, watchlistReason: 'Behind schedule',
  contractValue: 100_000_000, startDate: '2026-01-01T00:00:00.000Z', completionDate: '2027-01-01T00:00:00.000Z',
  budget: 80_000_000, actual: 60_000_000, variance: 20_000_000, utilization: 75, health: 'AT_RISK',
  progressPlanned: 55, progressActual: 48, cpi: 0.98, spi: 0.87,
  openRisks: 3, openNcr: 1, openHse: 1,
  nextMilestone: { name: 'Handover', plannedDate: '2027-01-01T00:00:00.000Z', isCritical: true },
  trend: [10, 30, 60, 100], teamCount: 2,
  team: [{ id: 'e1', name: 'Andi', position: 'PM', isKeyMember: true }],
};

const make = (over: Partial<ProjectRegisterItem>): ProjectRegisterItem => ({ ...base, ...over });

describe('urgencyGroup', () => {
  it('flags watchlist / critical / at-risk / open safety as attention', () => {
    expect(urgencyGroup(make({ isWatchlist: true }))).toBe('attention');
    expect(urgencyGroup(make({ isWatchlist: false, health: 'CRITICAL', openHse: 0, openRisks: 0 }))).toBe('attention');
    expect(urgencyGroup(make({ isWatchlist: false, health: 'ON_TRACK', openHse: 1, openRisks: 0 }))).toBe('attention');
  });
  it('marks completed projects as done', () => {
    expect(urgencyGroup(make({ status: 'COMPLETED', isWatchlist: false, health: 'ON_TRACK', openHse: 0, openRisks: 0 }))).toBe('done');
  });
  it('treats a clean active project as healthy', () => {
    expect(urgencyGroup(make({ isWatchlist: false, health: 'ON_TRACK', openHse: 0, openRisks: 0 }))).toBe('healthy');
  });
});

describe('ProjectCardView', () => {
  it('groups cards by urgency instead of a uniform grid', () => {
    render(<ProjectCardView items={[
      make({}),
      make({ projectId: 'p2', code: 'PRJ-02', name: 'Beta', isWatchlist: false, health: 'ON_TRACK', openHse: 0, openRisks: 0 }),
      make({ projectId: 'p3', code: 'PRJ-03', name: 'Gamma', status: 'COMPLETED', isWatchlist: false, health: 'ON_TRACK', openHse: 0, openRisks: 0 }),
    ]} />);
    expect(screen.getByRole('region', { name: 'Needs attention' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'On track' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Completed' })).toBeTruthy();
  });

  it('shows the hero progress with planned comparison and the CPI metric', () => {
    render(<ProjectCardView items={[make({})]} />);
    expect(screen.getByText('48%')).toBeTruthy();
    expect(screen.getByText(/vs 55%/)).toBeTruthy();
    expect(screen.getByText('0.98')).toBeTruthy();
  });

  it('surfaces the watchlist reason and open signals', () => {
    render(<ProjectCardView items={[make({})]} />);
    expect(screen.getByText('Behind schedule')).toBeTruthy();
    const card = screen.getByRole('link', { name: /Alpha EPC/ });
    expect(within(card).getByText('risks')).toBeTruthy();
    expect(within(card).getByText('NCR')).toBeTruthy();
    expect(within(card).getByText('HSE')).toBeTruthy();
  });

  it('shows the next milestone and the tagline', () => {
    render(<ProjectCardView items={[make({})]} />);
    expect(screen.getByText('Handover')).toBeTruthy();
    expect(screen.getByText('EPC fasilitas pengolahan')).toBeTruthy();
  });
});
