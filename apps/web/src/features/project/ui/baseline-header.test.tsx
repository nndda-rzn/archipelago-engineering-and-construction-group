import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const freeze = vi.fn();
const revision = vi.fn();
vi.mock('@/features/project', async () => {
  const actual = await vi.importActual<typeof import('@/features/project')>('@/features/project');
  return {
    ...actual,
    useFreezeBaseline: () => ({ mutate: freeze, isPending: false }),
    useOpenRevision: () => ({ mutate: revision, isPending: false }),
  };
});

import { BaselineHeader } from './baseline-header';

const frozen = {
  id: 'b1',
  version: 3,
  status: 'FROZEN' as const,
  label: 'VO-02',
  reason: null,
  frozenAt: '2026-10-22T00:00:00.000Z',
  total: 4.8e12,
};

describe('BaselineHeader', () => {
  it('names the frozen version and its date', () => {
    render(<BaselineHeader projectId="p1" baseline={frozen} hasOpenRevision={false} />);
    expect(screen.getByText(/v3/)).toBeTruthy();
    expect(screen.getByText(/22 Oct 2026/)).toBeTruthy();
  });

  it('offers Open revision when a baseline exists and none is open', () => {
    render(<BaselineHeader projectId="p1" baseline={frozen} hasOpenRevision={false} />);
    expect(screen.getByRole('button', { name: /open revision/i })).toBeTruthy();
  });

  it('hides Open revision while a revision is already open', () => {
    render(<BaselineHeader projectId="p1" baseline={frozen} hasOpenRevision />);
    expect(screen.queryByRole('button', { name: /open revision/i })).toBeNull();
    expect(screen.getByText(/revision open/i)).toBeTruthy();
  });

  it('makes Freeze the primary action when no baseline exists', () => {
    render(<BaselineHeader projectId="p1" baseline={null} hasOpenRevision={false} />);
    expect(screen.getByRole('button', { name: /freeze/i })).toBeTruthy();
    expect(screen.getByText(/no baseline frozen yet/i)).toBeTruthy();
  });

  it('does not offer Freeze twice when a revision is open', () => {
    render(<BaselineHeader projectId="p1" baseline={frozen} hasOpenRevision />);
    expect(screen.getAllByRole('button', { name: /freeze/i })).toHaveLength(1);
  });
});
