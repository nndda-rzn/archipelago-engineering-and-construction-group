import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { User } from '@aec/api-contracts';
import { UserList } from './user-list';

const u = (over: Partial<User>): User => ({
  id: 'u1', username: 'buyer', email: 'buyer@aec.local', displayName: 'Buyer Demo', status: 'ACTIVE',
  lastLoginAt: '2026-10-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z',
  jobTitle: 'Procurement Officer', department: 'Procurement', phone: null, managerId: null,
  legalEntityId: 'le1', organizationId: null, blockedAt: null, blockedReason: null,
  legalEntityCode: 'AEC-CON', legalEntityName: 'PT AEC Construction', organizationName: null,
  roles: ['BUYER'], roleDetails: [], activeSessions: 1, ...over,
});

describe('UserList', () => {
  it('shows name, job title, email and a role chip', () => {
    render(<UserList users={[u({})]} selectedId="" onSelect={() => {}} />);
    expect(screen.getByText('Buyer Demo')).toBeTruthy();
    expect(screen.getByText(/Procurement Officer/)).toBeTruthy();
    expect(screen.getByText('Buyer')).toBeTruthy();
  });

  it('flags a user with no role', () => {
    render(<UserList users={[u({ roles: [] })]} selectedId="" onSelect={() => {}} />);
    expect(screen.getByText('No role')).toBeTruthy();
  });

  it('marks the selected user for assistive tech and calls onSelect on click', () => {
    const onSelect = vi.fn();
    render(<UserList users={[u({})]} selectedId="u1" onSelect={onSelect} />);
    const option = screen.getByRole('option', { selected: true });
    expect(option.textContent).toContain('Buyer Demo');
    fireEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith('u1');
  });

  it('shows an active-session indicator', () => {
    render(<UserList users={[u({ activeSessions: 2 })]} selectedId="" onSelect={() => {}} />);
    expect(screen.getByLabelText(/2 active session/)).toBeTruthy();
  });
});
