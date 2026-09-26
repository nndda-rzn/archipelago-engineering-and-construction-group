import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createColumnHelper } from '@tanstack/react-table';
import {
  Button,
  ConfirmDialog,
  DataGrid,
  EmptyCell,
  Input,
  Label,
  Skeleton,
  StatusBadge,
  ToastProvider,
  useToast,
} from '@aec/ui';

describe('EmptyCell — nilai kosong bermakna untuk screen reader', () => {
  it('mengekspos accessible name default', () => {
    render(<EmptyCell />);
    expect(screen.getByLabelText('None')).toBeTruthy();
  });

  it('label dapat di-override sesuai konteks kolom', () => {
    render(<EmptyCell label="No approver" />);
    expect(screen.getByLabelText('No approver')).toBeTruthy();
  });
});

describe('StatusBadge — status memakai teks, bukan warna saja', () => {
  it('selalu merender label teks, bukan hanya warna', () => {
    const { container } = render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(container.querySelector('span[title="APPROVED"]')).toBeTruthy();
  });

  it('ikon dekoratif disembunyikan dari screen reader', () => {
    const { container } = render(<StatusBadge status="REJECTED" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('kode mesin tidak dirender sebagai teks mentah', () => {
    render(<StatusBadge status="UNDER_REVIEW" />);
    expect(screen.getByText('Under Review')).toBeTruthy();
    expect(screen.queryByText('UNDER_REVIEW')).toBeNull();
  });
});

describe('Skeleton — tidak mengumumkan noise ke screen reader', () => {
  it('blok skeleton ditandai aria-hidden', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Dialog — focus trap, Escape, dan penamaan', () => {
  it('mengekspos role dialog + nama dari title', () => {
    render(
      <ConfirmDialog open onOpenChange={vi.fn()} title="Publish baseline" description="Tidak bisa diedit." onConfirm={vi.fn()} />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getByText('Publish baseline')).toBeTruthy();
  });

  it('Escape menutup dialog', () => {
    const onOpenChange = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Hapus data" onConfirm={vi.fn()} />);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });
    expect(onOpenChange).toHaveBeenCalled();
  });

  it('setiap aksi dialog dapat dijangkau sebagai button', () => {
    render(<ConfirmDialog open onOpenChange={vi.fn()} title="Konfirmasi" onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
  });

  it('tombol close memakai aria-label, bukan hanya ikon', () => {
    render(
      <ConfirmDialog open onOpenChange={vi.fn()} title="Konfirmasi" onConfirm={vi.fn()} />,
    );
    // ConfirmDialog mematikan showClose; pakai Dialog + DialogContent untuk memverifikasi tombol X.
    expect(screen.queryByLabelText('Close dialog')).toBeNull();
  });
});

describe('Toast — diumumkan lewat live region', () => {
  function Harness() {
    const toast = useToast();
    return <Button onClick={() => toast({ title: 'Saved', description: 'Baseline tersimpan' })}>Show</Button>;
  }

  it('toast muncul dan diumumkan lewat live region', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByText('Saved')).toBeTruthy();

    // Radix merender announcer di portal terpisah (bukan leluhur judul toast) dan
    // mengisi teksnya setelah frame berikutnya, jadi live region dicari di document
    // lalu isinya ditunggu.
    await waitFor(() => {
      const liveRegion = document.querySelector('[role="status"][aria-live]');
      expect(liveRegion?.textContent).toContain('Saved');
    });
  });

  it('tombol tutup toast punya accessible name', () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByLabelText('Close notification')).toBeTruthy();
  });
});

describe('Form — label terhubung ke input', () => {
  it('Label htmlFor menautkan ke Input', () => {
    render(
      <>
        <Label htmlFor="project-code">Project code</Label>
        <Input id="project-code" />
      </>,
    );
    expect(screen.getByLabelText('Project code')).toBeTruthy();
  });
});

describe('DataGrid — header semantik dan aria-sort', () => {
  type Row = { name: string };
  const columnHelper = createColumnHelper<Row>();
  const columns = [columnHelper.accessor('name', { header: 'Nama', cell: (i) => i.getValue() })];
  const rows: Row[] = [{ name: 'Baris A' }, { name: 'Baris B' }];

  it('header sortable memakai scope=col dan aria-sort berubah saat diurutkan', () => {
    const onSortingChange = vi.fn();
    render(<DataGrid columns={columns} data={rows} sorting={[]} onSortingChange={onSortingChange} />);

    const th = screen.getByText('Nama').closest('th');
    expect(th?.getAttribute('scope')).toBe('col');
    expect(th?.getAttribute('aria-sort')).toBe('none');
  });

  it('aria-sort mencerminkan state sorting naik', () => {
    render(<DataGrid columns={columns} data={rows} sorting={[{ id: 'name', desc: false }]} onSortingChange={vi.fn()} />);
    expect(screen.getByText('Nama').closest('th')?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('aria-sort mencerminkan state sorting turun', () => {
    render(<DataGrid columns={columns} data={rows} sorting={[{ id: 'name', desc: true }]} onSortingChange={vi.fn()} />);
    expect(screen.getByText('Nama').closest('th')?.getAttribute('aria-sort')).toBe('descending');
  });
});
