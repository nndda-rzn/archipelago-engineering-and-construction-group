import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BaselineHistory } from './baseline-history';

const v2 = { id: 'b2', version: 2, status: 'FROZEN' as const, label: 'VO-01 steel', reason: 'Client change order', frozenAt: '2026-10-22T00:00:00.000Z', total: 5_120_000_000 };
const v1 = { id: 'b1', version: 1, status: 'FROZEN' as const, label: 'Original contract', reason: null, frozenAt: '2026-01-15T00:00:00.000Z', total: 4_800_000_000 };

describe('BaselineHistory', () => {
  it('lists versions newest first', () => {
    render(<BaselineHistory versions={[v2, v1]} />);
    const items = screen.getAllByTestId(/^version-/);
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toMatch(/v2/);
  });

  it('shows the frozen date and label for each version', () => {
    render(<BaselineHistory versions={[v2, v1]} />);
    const first = screen.getByTestId('version-b2');
    expect(first.textContent).toMatch(/22 Oct 2026/);
    expect(first.textContent).toMatch(/VO-01 steel/);
  });

  it('shows the reason a revision was opened', () => {
    render(<BaselineHistory versions={[v2, v1]} />);
    expect(screen.getByTestId('version-b2').textContent).toMatch(/Client change order/);
  });

  it('shows how much the total moved from the previous version', () => {
    render(<BaselineHistory versions={[v2, v1]} />);
    expect(screen.getByTestId('version-b2').textContent).toMatch(/\+Rp 320 jt/);
  });

  it('does not invent a delta for the oldest version', () => {
    render(<BaselineHistory versions={[v2, v1]} />);
    expect(screen.getByTestId('version-b1').textContent).not.toMatch(/vs v/);
  });

  it('marks the version currently in force', () => {
    render(<BaselineHistory versions={[v2, v1]} />);
    expect(screen.getByTestId('version-b2').textContent).toMatch(/current/i);
  });

  it('flags an open draft so it cannot be mistaken for a frozen baseline', () => {
    const draft = { ...v2, id: 'b3', version: 3, status: 'DRAFT' as const, frozenAt: null, label: null };
    render(<BaselineHistory versions={[draft, v2, v1]} />);
    expect(screen.getByTestId('version-b3').textContent).toMatch(/draft/i);
    expect(screen.getByTestId('version-b3').textContent).not.toMatch(/current/i);
  });

  it('explains the empty state instead of showing a blank column', () => {
    render(<BaselineHistory versions={[]} />);
    expect(screen.getByText(/no baseline frozen yet/i)).toBeTruthy();
  });

  it('says plainly when only one version exists', () => {
    render(<BaselineHistory versions={[v1]} />);
    expect(screen.getByText(/no revision yet/i)).toBeTruthy();
  });
});
