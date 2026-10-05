import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { WbsTree } from './wbs-tree';
import type { WbsItem } from '@aec/api-contracts';

const node = (id: string, code: string, name: string, children: WbsItem[] = []): WbsItem => ({
  id,
  code,
  name,
  description: null,
  sortOrder: 0,
  children,
});

const tree: WbsItem[] = [
  node('r1', '1', 'Root', [node('c1', '1.1', 'Anak Satu')]),
  node('r2', '2', 'Root Dua'),
];

describe('WbsTree', () => {
  beforeEach(() => localStorage.clear());

  it('render root + anak saat terbuka', () => {
    renderWithProviders(<WbsTree tree={tree} onAddChild={vi.fn()} />);
    expect(screen.getByText('Root')).toBeTruthy();
    expect(screen.getByText('Anak Satu')).toBeTruthy();
  });

  it('sembunyikan anak saat di-collapse + aria-expanded false', () => {
    renderWithProviders(<WbsTree tree={tree} onAddChild={vi.fn()} />);
    const toggle = screen.getByLabelText('Collapse 1');
    fireEvent.click(toggle);
    expect(screen.queryByText('Anak Satu')).toBeNull();
    expect(screen.getByLabelText('Expand 1').getAttribute('aria-expanded')).toBe('false');
  });

  it('node tanpa anak tidak punya tombol toggle', () => {
    renderWithProviders(<WbsTree tree={tree} onAddChild={vi.fn()} />);
    expect(screen.queryByLabelText('Collapse 2')).toBeNull();
    expect(screen.queryByLabelText('Expand 2')).toBeNull();
  });

  it('persist state collapsed ke localStorage', () => {
    renderWithProviders(<WbsTree tree={tree} onAddChild={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Collapse 1'));
    expect(localStorage.getItem('aec.wbs.collapsed')).toContain('"r1":true');
  });
});
