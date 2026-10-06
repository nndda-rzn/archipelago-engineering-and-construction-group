import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { WorkflowDefinition } from '@aec/api-contracts';
import { WorkflowDefinitionsRail, groupByCode } from './workflow-definitions-rail';

function def(overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition {
  return {
    id: 'd1',
    code: 'PR_APPROVAL',
    name: 'PR approval',
    description: null,
    version: 1,
    status: 'ACTIVE',
    transactionType: 'PurchaseRequisition',
    createdBy: 'u1',
    createdByName: 'Admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    steps: [
      { id: 's1', definitionId: 'd1', stepOrder: 1, name: 'Manager', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null, conditionGroup: null },
    ],
    ...overrides,
  };
}

const HOLDERS = { PROCUREMENT_MANAGER: 2, SUPER_ADMIN: 0 };

describe('groupByCode', () => {
  it('groups versions of the same code into one entry', () => {
    const groups = groupByCode([
      def({ id: 'a', version: 1, status: 'ARCHIVED' }),
      def({ id: 'b', version: 2, status: 'ACTIVE' }),
      def({ id: 'c', version: 3, status: 'DRAFT' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.versions.map((v) => v.version)).toEqual([3, 2, 1]);
  });

  it('marks the active version and sorts groups with an active version first', () => {
    const groups = groupByCode([
      def({ id: 'po', code: 'PO_APPROVAL', status: 'DRAFT', transactionType: 'PurchaseOrder' }),
      def({ id: 'pr', code: 'PR_APPROVAL', status: 'ACTIVE' }),
    ]);
    expect(groups[0]!.code).toBe('PR_APPROVAL');
    expect(groups[0]!.active?.id).toBe('pr');
    expect(groups[1]!.active).toBeNull();
  });
});

describe('WorkflowDefinitionsRail', () => {
  it('shows one group header per code, not one row per version', () => {
    render(
      <WorkflowDefinitionsRail
        definitions={[
          def({ id: 'a', version: 2, status: 'ACTIVE' }),
          def({ id: 'b', version: 3, status: 'DRAFT' }),
        ]}
        holdersByRole={HOLDERS}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );
    // Header grup (punya aria-expanded) + dua baris versi.
    expect(screen.getByRole('button', { expanded: true, name: /PR_APPROVAL/ })).toBeTruthy();
    const versions = screen.getByLabelText('PR_APPROVAL versions');
    expect(within(versions).getAllByRole('button')).toHaveLength(2);
  });

  it('shows the transaction type abbreviation on the group header', () => {
    render(
      <WorkflowDefinitionsRail definitions={[def()]} holdersByRole={HOLDERS} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('PR')).toBeTruthy();
  });

  it('reports approver coverage per version as text, not colour alone', () => {
    render(
      <WorkflowDefinitionsRail
        definitions={[
          def({
            id: 'a',
            version: 1,
            status: 'DRAFT',
            steps: [
              { id: 's1', definitionId: 'a', stepOrder: 1, name: 'Manager', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null, conditionGroup: null },
              { id: 's2', definitionId: 'a', stepOrder: 2, name: 'Board', approverRoleCode: 'SUPER_ADMIN', conditionField: null, conditionOp: null, conditionValue: null, conditionGroup: null },
            ],
          }),
        ]}
        holdersByRole={HOLDERS}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );
    // 1 dari 2 langkah punya pemegang.
    expect(screen.getByText('1/2')).toBeTruthy();
    // Detail ada di accessible name, bukan hanya angka visual.
    expect(screen.getByLabelText(/1 of 2 steps have an approver, 1 would stall the chain/)).toBeTruthy();
  });

  it('collapses and expands a group', () => {
    render(
      <WorkflowDefinitionsRail definitions={[def()]} holdersByRole={HOLDERS} selectedId={null} onSelect={vi.fn()} />,
    );
    const header = screen.getByRole('button', { expanded: true, name: /PR_APPROVAL/ });
    expect(header.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText('PR_APPROVAL versions')).toBeNull();
  });

  it('marks the selected version and calls back on click', () => {
    const onSelect = vi.fn();
    const target = def({ id: 'target', version: 2, status: 'DRAFT' });
    render(
      <WorkflowDefinitionsRail
        definitions={[def({ id: 'other', version: 1, status: 'ACTIVE' }), target]}
        holdersByRole={HOLDERS}
        selectedId="target"
        onSelect={onSelect}
      />,
    );
    const row = screen.getByLabelText(/PR_APPROVAL version 2, Draft/);
    expect(row.getAttribute('aria-current')).toBe('true');
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(target);
  });

  it('marks the selected version with a background, not a left border', () => {
    render(
      <WorkflowDefinitionsRail definitions={[def()]} holdersByRole={HOLDERS} selectedId="d1" onSelect={vi.fn()} />,
    );
    const row = screen.getByLabelText(/PR_APPROVAL version 1/);
    // Konsisten dengan sidebar nav / SegmentedControl / DataGrid: latar, bukan garis.
    expect(row.className).toContain('bg-neutral-100');
    expect(row.className).not.toContain('border-l');
  });

  it('does not reserve a transparent left border on unselected rows', () => {
    render(
      <WorkflowDefinitionsRail definitions={[def()]} holdersByRole={HOLDERS} selectedId={null} onSelect={vi.fn()} />,
    );
    const row = screen.getByLabelText(/PR_APPROVAL version 1/);
    expect(row.className).not.toContain('border-l');
  });
});
