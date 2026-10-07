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
    <section className={cn('flex flex-col', className)} {...props}>
      <div className="mb-3.5 flex items-baseline gap-3">
        <h2 className="text-overline uppercase text-neutral-900">{name}</h2>
        {count && <span className="font-mono text-caption tabular-nums text-neutral-500">{count}</span>}
        <span aria-hidden="true" className="h-px flex-1 bg-neutral-200" />
        {right && <div className="flex shrink-0 items-center gap-3 text-caption text-neutral-500">{right}</div>}
      </div>
      {children}
    </section>
  );
}
