import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, statusMeta } from '@aec/ui';

describe('StatusBadge', () => {
  it('render status known dengan label', () => {
    render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeTruthy();
  });

  it('status unknown diturunkan, bukan kode mentah', () => {
    render(<StatusBadge status="SOME_CUSTOM" />);
    expect(screen.getByText('Some Custom')).toBeTruthy();
    expect(screen.queryByText('SOME_CUSTOM')).toBeNull();
  });

  it('override label', () => {
    render(<StatusBadge status="DRAFT" label="Draf" />);
    expect(screen.getByText('Draf')).toBeTruthy();
  });

  it('icon hadir (svg)', () => {
    const { container } = render(<StatusBadge status="REJECTED" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('statusMeta bahasa', () => {
  it('semua label berbahasa Inggris (tanpa kata Indonesia)', () => {
    const indonesia = [
      'Ditolak', 'Dibatalkan', 'Aktif', 'Nonaktif', 'Selesai', 'Kritis', 'Berisiko',
      'Menang', 'Kalah', 'Investigasi', 'Dicabut', 'Diganti', 'Terkunci', 'Berakhir',
      'Tersedia', 'Terbuka', 'Dimitigasi', 'Direncanakan', 'Temuan', 'Dieksekusi',
      'Diakhiri', 'Diamendemen', 'Lulus', 'Gagal', 'Akan Datang', 'Ditutup',
      'Potensial', 'Tinggi', 'Sedang', 'Rendah', 'Lunas',
    ];
    const used = new Set(Object.values(statusMeta).map((m) => m.label));
    for (const word of indonesia) {
      expect(used.has(word)).toBe(false);
    }
  });

  it('hanya memakai karakter ASCII pada label', () => {
    for (const meta of Object.values(statusMeta)) {
      if (meta.label) expect(meta.label).toMatch(/^[\x20-\x7E]+$/);
    }
  });

  it('status berbeda tidak berbagi label yang sama kecuali memang sengaja identik', () => {
    // COMPLETED dan SETTLED sebelumnya sama-sama "Selesai"; kini dibedakan.
    expect(statusMeta.COMPLETED.label).toBe('Completed');
    expect(statusMeta.SETTLED.label).toBe('Settled');
    expect(statusMeta.WON.label).toBe('Won');
    expect(statusMeta.CLOSED_WON.label).toBe('Closed Won');
  });
});
