import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { WorkflowStep } from '@aec/api-contracts';
import { WorkflowChainList } from './workflow-chain-list';

function step(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return {
    id: 's1',
    definitionId: 'd1',
    stepOrder: 1,
    name: 'Manager approval',
    approverRoleCode: 'PROCUREMENT_MANAGER',
    conditionField: null,
    conditionOp: null,
    conditionValue: null,
    conditionGroup: null,
    ...overrides,
  };
}

const HOLDERS = { PROCUREMENT_MANAGER: 1, SUPER_ADMIN: 2 };
const NAMES = { PROCUREMENT_MANAGER: ['AEC Administrator'], SUPER_ADMIN: ['AEC Administrator', 'CFO Demo'] };

function renderList(props: Partial<React.ComponentProps<typeof WorkflowChainList>> = {}) {
  return render(
    <WorkflowChainList
      steps={[step(), step({ id: 's2', stepOrder: 2, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN' })]}
      onSelectStep={vi.fn()}
      holdersByRole={HOLDERS}
      holderNamesByRole={NAMES}
      locked={false}
      transactionType="PurchaseRequisition"
      onReorder={vi.fn()}
      {...props}
    />,
  );
}

describe('WorkflowChainList', () => {
  it('renders an ordered list, not a canvas', () => {
    renderList();
    const list = screen.getByRole('list', { name: /Approval chain/i });
    expect(list.tagName).toBe('OL');
  });

  it('brackets the chain with a trigger and a result so it reads as a process', () => {
    renderList();
    expect(screen.getByText(/Purchase requisition submitted/i)).toBeTruthy();
    expect(screen.getByText(/Purchase requisition approved/i)).toBeTruthy();
  });

  it('names the people who can approve, not just how many', () => {
    renderList();
    expect(screen.getByLabelText(/Step 2: Board approval/).textContent).toMatch(/AEC Administrator, CFO Demo/);
  });

  it('flags a step whose approver role nobody holds', () => {
    renderList({
      steps: [step({ approverRoleCode: 'NOBODY' })],
      holdersByRole: { NOBODY: 0 },
      holderNamesByRole: { NOBODY: [] },
    });
    expect(screen.getByText(/No approver, so the chain will stall/i)).toBeTruthy();
  });

  describe('reordering', () => {
    it('offers a non-drag button for every step (WCAG 2.5.7)', () => {
      renderList();
      expect(screen.getByRole('button', { name: /Move step 1 later/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Move step 2 earlier/i })).toBeTruthy();
    });

    it('disables the buttons at the ends', () => {
      renderList();
      expect((screen.getByRole('button', { name: /Move step 1 earlier/i }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole('button', { name: /Move step 2 later/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('sends the full step list in the new order', () => {
      const onReorder = vi.fn();
      renderList({ onReorder });
      fireEvent.click(screen.getByRole('button', { name: /Move step 1 later/i }));
      expect(onReorder).toHaveBeenCalledWith(['s2', 's1']);
    });

    it('supports Alt + arrow on the drag handle as a keyboard equivalent', () => {
      const onReorder = vi.fn();
      renderList({ onReorder });
      fireEvent.keyDown(screen.getByRole('button', { name: /Reorder step 1/i }), { key: 'ArrowDown', altKey: true });
      expect(onReorder).toHaveBeenCalledWith(['s2', 's1']);
    });
  });

  describe('selection styling is consistent with the rest of the app', () => {
    it('marks the selected step with a background, not a left border', () => {
      const { container } = renderList({ selectedStepId: 's1' });
      // `aria-pressed` ada di tombol di dalam baris; barisnya adalah `li` induknya.
      const selectedButton = container.querySelector('button[aria-pressed="true"]')!;
      const selectedRow = selectedButton.closest('li')!;
      // Latar = bahasa seleksi yang dipakai sidebar nav, SegmentedControl,
      // DataGrid, dan financial band. Garis kiri hanya dipakai di sini.
      expect(selectedRow.className).toContain('bg-neutral-100');
      expect(selectedRow.className).not.toContain('border-l');
    });

    it('does not reserve a transparent left border on unselected rows', () => {
      const { container } = renderList();
      // `border-transparent` tetap memakan 2px dan menambah keramaian visual.
      const rows = [...container.querySelectorAll('li')].filter((li) => li.querySelector('button[aria-pressed]'));
      expect(rows.length).toBeGreaterThan(0);
      for (const li of rows) {
        expect(li.className).not.toContain('border-l');
      }
    });

    it('keeps the no-approver warning visible without a coloured left border', () => {
      renderList({
        steps: [step({ approverRoleCode: 'NOBODY' })],
        holdersByRole: { NOBODY: 0 },
        holderNamesByRole: { NOBODY: [] },
      });
      // Tiga isyarat independen: badge nomor, ikon, dan teks.
      expect(screen.getByText(/No approver, so the chain will stall/i)).toBeTruthy();
      expect(screen.getByLabelText(/no approver assigned/i)).toBeTruthy();
    });
  });

  describe('the step number reads as a position in a sequence', () => {
    it('renders the order as a numbered rail marker, not a decorative badge', () => {
      const { container } = renderList();
      const markers = container.querySelectorAll('[data-slot="step-order"]');
      expect(markers).toHaveLength(2);
      expect(markers[0]!.textContent).toBe('1');
      expect(markers[1]!.textContent).toBe('2');
    });

    it('draws a connecting line between consecutive steps so order is visible', () => {
      const { container } = renderList();
      // Garis penghubung hanya ANTAR langkah — tidak di langkah terakhir.
      const connectors = container.querySelectorAll('[data-slot="step-connector"]');
      expect(connectors).toHaveLength(1);
    });

    it('does not draw a connector after the last step', () => {
      const { container } = renderList({
        steps: [step()],
        holdersByRole: HOLDERS,
        holderNamesByRole: NAMES,
      });
      expect(container.querySelectorAll('[data-slot="step-connector"]')).toHaveLength(0);
    });
  });

  describe('locked (active) versions', () => {
    it('hides the drag handle and the reorder buttons', () => {
      renderList({ locked: true, onReorder: undefined });
      expect(screen.queryByRole('button', { name: /Reorder step/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Move step/i })).toBeNull();
    });

    it('still allows selecting a step', () => {
      const onSelectStep = vi.fn();
      renderList({ locked: true, onReorder: undefined, onSelectStep });
      fireEvent.click(screen.getByLabelText(/Step 1: Manager approval/));
      expect(onSelectStep).toHaveBeenCalledWith('s1');
    });
  });

  describe('simulation', () => {
    it('dims a skipped step and says so in its accessible name', () => {
      renderList({ activeStepOrders: [1] });
      // Baris langkah yang dilewati diredupkan; baris yang berjalan tidak.
      const skippedRow = screen.getByLabelText(/skipped for this amount/i).closest('li')!;
      expect(skippedRow.className).toContain('opacity-40');
      expect(screen.getByLabelText(/Step 1: Manager approval/).closest('li')!.className).not.toContain('opacity-40');
    });
  });

  it('shows the condition as a chip when a step has one', () => {
    renderList({
      steps: [step({ conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 })],
    });
    expect(screen.getByText(/Estimated total > /)).toBeTruthy();
  });

  it('shows every rule of a compound condition', () => {
    renderList({
      steps: [step({
        conditionGroup: {
          combinator: 'AND',
          conditions: [
            { field: 'estimatedTotal', op: '>', value: 5_000_000 },
            { field: 'estimatedTotal', op: '<=', value: 50_000_000 },
          ],
        },
      })],
    });
    expect(screen.getByText(/and/)).toBeTruthy();
  });

  it('renders an empty state instead of an empty list', () => {
    renderList({ steps: [] });
    expect(screen.getByText(/No steps yet/i)).toBeTruthy();
    expect(screen.queryByRole('list', { name: /Approval chain/i })).toBeNull();
  });
});
