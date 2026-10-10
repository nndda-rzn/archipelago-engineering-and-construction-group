import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalEntityRegister } from './legal-entity-register';

const items = [
  {
    id: 'le1',
    code: 'AEC-CON',
    legalName: 'PT AEC Construction',
    status: 'ACTIVE',
    country: 'ID',
    functionalCurrency: 'IDR',
    metrics: { projects: 4, users: 12, organizations: 3, chartOfAccounts: 40, bankAccounts: 2, periodCloses: 3, employees: 8, equipment: 5 },
  },
];

describe('LegalEntityRegister', () => {
  it('renders a semantic table with a scale bar', () => {
    render(<LegalEntityRegister items={items as never} onRowClick={() => {}} sort={[]} onSortChange={() => {}} />);
    expect(screen.getByRole('table', { name: /legal entities/i })).toBeTruthy();
    expect(screen.getByRole('img', { name: /scale/i })).toBeTruthy();
  });

  it('does not divide by zero when all metrics are zero', () => {
    const zero = [{ ...items[0], metrics: { projects: 0, users: 0, organizations: 0, chartOfAccounts: 0, bankAccounts: 0, periodCloses: 0, employees: 0, equipment: 0 } }];
    render(<LegalEntityRegister items={zero as never} onRowClick={() => {}} sort={[]} onSortChange={() => {}} />);
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
  });
});
