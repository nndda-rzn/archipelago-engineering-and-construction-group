import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalEntityListPage } from './legal-entity-list.page';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigate: () => vi.fn(),
}));
vi.mock('@/entities/legal-entity', () => ({
  useLegalEntities: () => ({
    data: { items: [{ id: 'le1', code: 'AEC-CON', legalName: 'PT AEC', status: 'ACTIVE', country: 'ID', functionalCurrency: 'IDR' }], total: 1, totalPages: 1 },
    isLoading: false,
    isError: false,
    refetch: () => {},
  }),
}));
vi.mock('@/features/foundation/ui', () => ({
  LegalEntityListToolbar: () => <div data-testid="toolbar" />,
  LegalEntityRegister: () => <div data-testid="register" />,
  LegalEntityForm: () => <div data-testid="form" />,
  useLegalEntityListFilters: () => ({ search: '', status: '', setSearch: () => {}, setStatus: () => {} }),
}));

describe('LegalEntityListPage', () => {
  it('renders toolbar and register', () => {
    render(<LegalEntityListPage />);
    expect(screen.getByTestId('toolbar')).toBeTruthy();
    expect(screen.getByTestId('register')).toBeTruthy();
  });
});
