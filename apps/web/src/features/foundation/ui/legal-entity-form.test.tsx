import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LegalEntityForm } from './legal-entity-form';

// Radix Select butuh API pointer/scroll yang tidak lengkap di jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock('@/entities/legal-entity', () => ({
  useCreateLegalEntity: () => ({ mutate: () => {}, isPending: false, isError: false }),
  useUpdateLegalEntity: () => ({ mutate: () => {}, isPending: false, isError: false }),
}));

const currencies = [
  { id: 'cur-idr', code: 'IDR', name: 'Indonesian Rupiah' },
  { id: 'cur-usd', code: 'USD', name: 'US Dollar' },
];
vi.mock('@/features/foundation-hardening', () => ({
  useCurrencies: () => ({ data: { items: currencies }, isLoading: false }),
}));

describe('LegalEntityForm', () => {
  it('renders currency as a real dropdown (combobox), not a free-text datalist', () => {
    render(<LegalEntityForm mode="create" onDone={() => {}} />);
    // Functional & reporting currency harus berupa combobox, bukan input teks biasa.
    expect(screen.getByRole('combobox', { name: /functional currency/i })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /reporting currency/i })).toBeTruthy();
    // Tidak boleh ada <datalist> lagi.
    expect(document.querySelector('datalist')).toBeNull();
  });

  it('lets the user pick a currency from the dropdown', () => {
    render(<LegalEntityForm mode="create" onDone={() => {}} />);
    const trigger = screen.getByRole('combobox', { name: /functional currency/i });
    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByText(/USD/));
    expect(trigger.textContent).toContain('USD');
  });

  it('keeps the fiscal calendar field', () => {
    render(<LegalEntityForm mode="create" onDone={() => {}} />);
    expect(screen.getByLabelText(/fiscal calendar/i)).toBeTruthy();
  });
});
