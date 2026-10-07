import { describe, expect, it, vi } from 'vitest';
import { searchNav } from './command-palette';
import { allNavItems } from '@/app/layouts/nav-config';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

describe('searchNav', () => {
  const items = allNavItems();

  it('returns everything for an empty query', () => {
    expect(searchNav(items, '')).toHaveLength(items.length);
  });

  it('matches on label', () => {
    const results = searchNav(items, 'invoice');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => /invoice/i.test(r.label))).toBe(true);
  });

  it('matches on group name', () => {
    const results = searchNav(items, 'governance');
    expect(results.some((r) => r.group === 'Governance')).toBe(true);
  });

  it('normalizes separators and case', () => {
    const results = searchNav(items, 'purchase order');
    expect(results.some((r) => r.label === 'Purchase Order')).toBe(true);
    // Query tanpa spasi & huruf kecil tetap cocok.
    expect(searchNav(items, 'purchaseorder').some((r) => r.label === 'Purchase Order')).toBe(true);
  });

  it('returns nothing for a query that matches no menu', () => {
    expect(searchNav(items, 'zzzzz')).toHaveLength(0);
  });
});
