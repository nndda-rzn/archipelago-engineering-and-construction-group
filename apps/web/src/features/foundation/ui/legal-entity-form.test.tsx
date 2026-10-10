import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalEntityForm } from './legal-entity-form';

vi.mock('@/entities/legal-entity', () => ({
  useCreateLegalEntity: () => ({ mutate: () => {}, isPending: false, isError: false }),
  useUpdateLegalEntity: () => ({ mutate: () => {}, isPending: false, isError: false }),
}));
vi.mock('@/features/foundation-hardening', () => ({
  useCurrencies: () => ({ data: { items: [{ code: 'IDR', name: 'Rupiah' }] } }),
}));

describe('LegalEntityForm', () => {
  it('renders currency and fiscal calendar fields', () => {
    render(<LegalEntityForm mode="create" onDone={() => {}} />);
    expect(screen.getByLabelText(/functional currency/i)).toBeTruthy();
    expect(screen.getByLabelText(/reporting currency/i)).toBeTruthy();
    expect(screen.getByLabelText(/fiscal calendar/i)).toBeTruthy();
  });
});
