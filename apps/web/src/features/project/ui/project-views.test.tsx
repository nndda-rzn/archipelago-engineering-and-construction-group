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

import { ProjectCardView, cardSignal, cardVerdict, urgencyGroup } from './project-views';

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

/** Proyek bersih: tanpa watchlist, tanpa sinyal terbuka, ada tim, tepat sesuai rencana. */
const clean = (over: Partial<ProjectRegisterItem> = {}) =>
  make({ isWatchlist: false, watchlistReason: null, openRisks: 0, openNcr: 0, openHse: 0, healthStatus: 'ON_TRACK', health: 'ON_TRACK', progressActual: 55, progressPlanned: 55, ...over });

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

describe('cardVerdict', () => {
  it('follows healthStatus, not the cost-consumption health field', () => {
    // Regresi: dulu kartu mewarnai diri dari `health` (serapan biaya) yang hampir
    // selalu ON_TRACK, sehingga proyek CRITICAL tampil hijau "On Track".
    expect(cardVerdict(make({ healthStatus: 'CRITICAL', health: 'ON_TRACK' })).key).toBe('CRITICAL');
    expect(cardVerdict(make({ healthStatus: 'AT_RISK', health: 'ON_TRACK' })).key).toBe('AT_RISK');
  });

  it('lets a completed project win over its risk level', () => {
    expect(cardVerdict(make({ status: 'COMPLETED', healthStatus: 'CRITICAL' })).key).toBe('COMPLETED');
    expect(cardVerdict(make({ status: 'CLOSED', healthStatus: 'AT_RISK' })).key).toBe('COMPLETED');
  });

  it('reports on hold before on track', () => {
    expect(cardVerdict(make({ status: 'ON_HOLD', healthStatus: 'ON_TRACK' })).key).toBe('ON_HOLD');
    expect(cardVerdict(make({ status: 'ACTIVE', healthStatus: 'ON_HOLD' })).key).toBe('ON_HOLD');
  });

  it('falls back to on track', () => {
    expect(cardVerdict(clean()).key).toBe('ON_TRACK');
  });
});

describe('cardSignal', () => {
  it('surfaces only the strongest signal, safety before quality before risk', () => {
    expect(cardSignal(make({ openHse: 2, openNcr: 3, openRisks: 5 }))?.kind).toBe('watchlist');
    expect(cardSignal(make({ isWatchlist: false, openHse: 2, openNcr: 3, openRisks: 5 }))?.kind).toBe('hse');
    expect(cardSignal(make({ isWatchlist: false, openHse: 0, openNcr: 3, openRisks: 5 }))?.kind).toBe('ncr');
    expect(cardSignal(make({ isWatchlist: false, openHse: 0, openNcr: 0, openRisks: 5 }))?.kind).toBe('risk');
  });

  it('treats a missing team as a signal, and a present team as none', () => {
    expect(cardSignal(make({ isWatchlist: false, openHse: 0, openNcr: 0, openRisks: 0, teamCount: 0 }))?.kind).toBe('noteam');
    expect(cardSignal(clean())).toBeNull();
  });

  it('falls back to a schedule slip when nothing else is wrong', () => {
    expect(cardSignal(clean({ progressActual: 40, progressPlanned: 60 }))?.kind).toBe('behind');
    expect(cardSignal(clean({ progressActual: 60, progressPlanned: 60 }))).toBeNull();
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

  it('shows the verdict from healthStatus and the progress against plan', () => {
    render(<ProjectCardView items={[make({})]} />);
    expect(screen.getByText('At risk')).toBeTruthy();
    expect(screen.getByText('48%')).toBeTruthy();
    expect(screen.getByText('−7 pts vs 55%')).toBeTruthy();
  });

  it('renders a critical project as critical even when cost consumption is healthy', () => {
    render(<ProjectCardView items={[make({ healthStatus: 'CRITICAL', health: 'ON_TRACK' })]} />);
    expect(screen.getByText('Critical')).toBeTruthy();
    expect(screen.queryByText('On track')).toBeNull();
  });

  it('surfaces one signal — the strongest — instead of three competing chips', () => {
    render(<ProjectCardView items={[make({})]} />);
    const card = screen.getByRole('link', { name: /Alpha EPC/ });
    // Watchlist reason menang atas HSE/NCR/risks.
    expect(within(card).getByText('Behind schedule')).toBeTruthy();
    expect(within(card).queryByText('risks')).toBeNull();
    expect(within(card).queryByText('NCR')).toBeNull();
  });

  it('labels cost consumption explicitly and compacts the contract value', () => {
    render(<ProjectCardView items={[make({})]} />);
    const card = screen.getByRole('link', { name: /Alpha EPC/ });
    expect(within(card).getByText('Budget used')).toBeTruthy();
    // Uang ringkas (formatIdrCompact) + nominal penuh di title.
    const money = within(card).getByTitle(/Rp\s?100\.000\.000/);
    expect(money.textContent).toBe('Rp 100 jt');
  });

  it('keeps the phase and client as context under the name', () => {
    render(<ProjectCardView items={[make({})]} />);
    expect(screen.getByText('Construction · PT Klien')).toBeTruthy();
  });
});
