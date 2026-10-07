import * as React from 'react';
import { cn } from '../lib/cn';

export interface SectionBandProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Nama zona, mis. "Attention". Ditampilkan sebagai label kecil. */
  name: string;
  /** Angka/konteks ringkas di sebelah nama (mis. "12 open"). */
  count?: string;
  /** Slot kanan: legenda, toggle, atau aksi zona. */
  right?: React.ReactNode;
  /** Slot di bawah header (isi zona). */
  children?: React.ReactNode;
}

/**
 * Header zona berbasis rule (bukan kartu): nama + opsional count + garis penuh +
 * slot kanan. Struktur datang dari garis dan jarak, bukan dari border mengelilingi
 * setiap sel. Dipakai sebagai pembuka setiap zona dashboard.
 */
export function SectionBand({ name, count, right, children, className, ...props }: SectionBandProps) {
  return (
    <section className={cn('flex min-w-0 flex-col', className)} {...props}>
      {/* Header boleh wrap: di layar sempit judul panjang + klaster kanan
          (legenda/aksi) tidak boleh saling menimpa. Garis rule disembunyikan
          saat wrap agar tidak "menggantung". */}
      <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <h2 className="min-w-0 truncate text-overline uppercase text-neutral-900" title={name}>
          {name}
        </h2>
        {count && <span className="shrink-0 font-mono text-caption tabular-nums text-neutral-500">{count}</span>}
        <span aria-hidden="true" className="hidden h-px min-w-[2rem] flex-1 bg-neutral-200 sm:block" />
        {right && <div className="flex shrink-0 flex-wrap items-center gap-3 text-caption text-neutral-500">{right}</div>}
      </div>
      {children}
    </section>
  );
}
