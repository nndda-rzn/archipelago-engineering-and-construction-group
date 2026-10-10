import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalEntityDetailPage } from './legal-entity-detail.page';

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ entityId: 'le1' }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/entities/legal-entity', () => ({
  useLegalEntity: () => ({
    data: {
      id: 'le1', code: 'AEC-CON', legalName: 'PT AEC', status: 'ACTIVE', country: 'ID',
      functionalCurrency: 'IDR', reportingCurrency: 'IDR', fiscalCalendar: 'STANDARD',
      taxIdentifier: 'x', functionalCurrencyId: 'cur-idr', reportingCurrencyId: 'cur-idr', createdAt: 'x', updatedAt: 'x',
    },
    isLoading: false, isError: false, refetch: () => {},
  }),
  useLegalEntityUsage: () => ({
    data: { projects: 4, users: 12, organizations: 3, chartOfAccounts: 40, bankAccounts: 2, periodCloses: 3, employees: 8, equipment: 5, generatedAt: 'x' },
    isLoading: false, isError: false, refetch: () => {},
  }),
  useBlockLegalEntity: () => ({ mutate: () => {}, isPending: false }),
  useUnblockLegalEntity: () => ({ mutate: () => {}, isPending: false }),
}));

describe('LegalEntityDetailPage', () => {
  it('renders the profile and a used-in section', () => {
    render(<LegalEntityDetailPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByText(/used in/i)).toBeTruthy();
  });
});
