import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ProjectTeamMember } from '@aec/api-contracts';

const team: ProjectTeamMember[] = [
  { assignmentId: 'a1', employeeId: 'e1', name: 'Ahmad Fauzi', position: 'Project Manager', department: 'Construction', grade: 'L3', employeeNumber: 'EMP-000003', role: 'Project Manager', allocationPercent: 60, startDate: '2026-01-01T00:00:00.000Z', endDate: null, isKeyMember: true, status: 'ACTIVE' },
  { assignmentId: 'a2', employeeId: 'e2', name: 'Dewi Lestari', position: 'Site Engineer', department: 'Engineering', grade: 'L2', employeeNumber: 'EMP-000004', role: 'Site Engineer', allocationPercent: 40, startDate: '2026-02-01T00:00:00.000Z', endDate: '2026-12-31T00:00:00.000Z', isKeyMember: false, status: 'ACTIVE' },
];

const useProjectTeam = vi.fn(() => ({ data: { items: team, total: 2, totalAllocation: 100 }, isLoading: false }));
const useProjectEmployees = vi.fn(() => ({ data: [{ id: 'e9', name: 'New Person', position: 'Planner', department: null, employeeNumber: 'EMP-9' }] }));
vi.mock('@/entities/project', () => ({
  useProjectTeam: () => useProjectTeam(),
  useProjectEmployees: () => useProjectEmployees(),
  useAddProjectMember: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveProjectMember: () => ({ mutate: vi.fn() }),
}));

import { ProjectTeamBand } from './project-team-band';

describe('ProjectTeamBand', () => {
  it('lists every member with their role and allocation', () => {
    render(<ProjectTeamBand projectId="p1" />);
    expect(screen.getByText('Ahmad Fauzi')).toBeTruthy();
    expect(screen.getByText('Project Manager')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('Dewi Lestari')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
  });

  it('shows the team size and total allocation', () => {
    render(<ProjectTeamBand projectId="p1" />);
    expect(screen.getByText(/2 people/)).toBeTruthy();
    expect(screen.getByText(/100% allocated/)).toBeTruthy();
  });

  it('marks a key member', () => {
    render(<ProjectTeamBand projectId="p1" />);
    expect(screen.getByText('key')).toBeTruthy();
  });

  it('offers a way to remove each member', () => {
    render(<ProjectTeamBand projectId="p1" />);
    expect(screen.getByLabelText('Remove Ahmad Fauzi from project')).toBeTruthy();
    expect(screen.getByLabelText('Remove Dewi Lestari from project')).toBeTruthy();
  });
});
