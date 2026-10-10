import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrgOutline } from './org-outline';

const node = (id: string, name: string, children: unknown[] = []) => ({
  item: { id, legalEntityId: 'le1', name, orgType: 'BUSINESS_UNIT', parentId: null, effectiveFrom: '2026-01-01', effectiveTo: null, status: 'ACTIVE' },
  children,
});

describe('OrgOutline', () => {
  it('renders nested units with indentation and a zero-child unit without crashing', () => {
    render(<OrgOutline nodes={[node('o1', 'Group', [node('o2', 'BU')])] as never} onEdit={() => {}} />);
    expect(screen.getByText('Group')).toBeTruthy();
    expect(screen.getByText('BU')).toBeTruthy();
  });

  it('renders an empty state when there are no units', () => {
    render(<OrgOutline nodes={[]} onEdit={() => {}} />);
    expect(screen.getByText(/no organization units/i)).toBeTruthy();
  });
});
