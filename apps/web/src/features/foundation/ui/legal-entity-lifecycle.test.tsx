import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalEntityLifecycle } from './legal-entity-lifecycle';

vi.mock('@/entities/legal-entity', () => ({
  useBlockLegalEntity: () => ({ mutate: () => {}, isPending: false }),
  useUnblockLegalEntity: () => ({ mutate: () => {}, isPending: false }),
}));

describe('LegalEntityLifecycle', () => {
  it('offers Block for an ACTIVE entity and Activate for a BLOCKED one', () => {
    const { unmount } = render(<LegalEntityLifecycle entity={{ id: 'le1', status: 'ACTIVE' } as never} onEdit={() => {}} />);
    expect(screen.getByRole('button', { name: /block/i })).toBeTruthy();
    unmount();
    render(<LegalEntityLifecycle entity={{ id: 'le1', status: 'BLOCKED' } as never} onEdit={() => {}} />);
    expect(screen.getByRole('button', { name: /activate/i })).toBeTruthy();
  });
});
