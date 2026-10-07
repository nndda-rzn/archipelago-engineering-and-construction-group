import * as React from 'react';
import { cn } from '../lib/cn';

export type ExceptionSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExceptionItem {
  key: string;
  severity: ExceptionSeverity;
  /** Jenis exception, mis. "Approval SLA" | "NCR overdue". */
  type: string;
  /** Nomor dokumen, mis. "PO-2026-0184". */
  documentCode?: string | null;
  /** Domain pemilik, mis. "Procurement". */
  domain: string;
  /** Umur sejak dibuat (hari). */
  ageDays: number;
  /** Batas SLA (hari). Null = tanpa tenggat. */
  slaDays?: number | null;
  /** Sudah melewati SLA. */
  overdue: boolean;
  /** Deep-link tujuan drill-down. */
  to: string;
}

export interface ExceptionQueueProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ExceptionItem[];
  /** Kelas tombol baris — biasanya `Link` dari router, agar drill-through = <a>. */
  renderRow?: (item: ExceptionItem, content: React.ReactNode) => React.ReactNode;
  /** Pesan saat kosong. */
  emptyMessage?: string;
}

const SEV_DOT: Record<ExceptionSeverity, string> = {
  HIGH: 'bg-destructive-700',
  MEDIUM: 'bg-warning-700',
  LOW: 'bg-info-700',
};
const SEV_TEXT: Record<ExceptionSeverity, string> = {
  HIGH: 'text-destructive-700',
  MEDIUM: 'text-warning-700',
  LOW: 'text-info-700',
};

/** Proporsi severity untuk bar tersegmentasi (dihitung dari item, bukan tebakan). */
export function severityBreakdown(items: ExceptionItem[]): { HIGH: number; MEDIUM: number; LOW: number; total: number } {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const i of items) counts[i.severity] += 1;
  return { ...counts, total: items.length };
}

function RowContent({ item }: { item: ExceptionItem }) {
  const slaPct = item.slaDays && item.slaDays > 0 ? Math.min(100, (item.ageDays / item.slaDays) * 100) : null;
  return (
    <>
      {/* Baris 1: severity + jenis exception + umur (umur rata kanan, tidak menyusut). */}
      <span className="flex min-w-0 items-center gap-2">
        <span className={cn('inline-flex shrink-0 items-center gap-1.5 text-caption font-semibold', SEV_TEXT[item.severity])}>
          <span aria-hidden="true" className={cn('inline-block h-2 w-2 shrink-0 rounded-full', SEV_DOT[item.severity])} />
          {item.severity}
        </span>
        <span className="min-w-0 truncate text-body-sm text-neutral-900" title={item.type}>
          {item.type}
        </span>
        <span
          className={cn(
            'ml-auto shrink-0 font-mono text-caption tabular-nums',
            item.overdue ? 'text-destructive-700' : 'text-neutral-500',
          )}
        >
          {item.ageDays}d
        </span>
      </span>
      {/* Baris 2: dokumen · domain — mendapat lebar penuh, tidak berdesakan dengan severity. */}
      {(item.documentCode || item.domain) && (
        <span className="min-w-0 truncate font-mono text-caption text-neutral-500" title={`${item.documentCode ?? ''}${item.documentCode ? ' · ' : ''}${item.domain}`}>
          {item.documentCode}
          {item.documentCode && item.domain ? <span className="text-neutral-400"> · </span> : null}
          <span className="text-neutral-400">{item.domain}</span>
        </span>
      )}
      {/* Baris 3: bar SLA penuh lebar. */}
      <span
        role="img"
        aria-label={`age ${item.ageDays} of ${item.slaDays ?? '—'} day SLA`}
        className="block h-1.5 w-full overflow-hidden rounded-sm bg-neutral-100"
      >
        {slaPct != null && (
          <span
            data-slot="sla-fill"
            className={cn('block h-full rounded-sm', item.overdue ? 'bg-destructive-700' : 'bg-warning-700')}
            style={{ width: `${slaPct}%` }}
          />
        )}
      </span>
    </>
  );
}

/**
 * Daftar exception ber-SLA. Header proporsi severity tetap di atas; daftar baris
 * punya **tinggi terkunci + scroll internal** agar panel tidak mendikte tinggi
 * baris grid (penyebab ruang kosong besar di kolom sebelahnya) dan tiap baris
 * memakai tata letak 3-baris yang tahan terhadap kolom sempit.
 */
export function ExceptionQueue({ items, renderRow, emptyMessage = 'No open exceptions.', className, ...props }: ExceptionQueueProps) {
  const { HIGH, MEDIUM, LOW, total } = severityBreakdown(items);

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {total > 0 && (
        <div className="mb-2.5 flex h-2 w-full overflow-hidden rounded-sm bg-neutral-100" aria-hidden="true">
          <span style={{ width: `${(HIGH / total) * 100}%` }} className="bg-destructive-700" />
          <span style={{ width: `${(MEDIUM / total) * 100}%` }} className="bg-warning-700" />
          <span style={{ width: `${(LOW / total) * 100}%` }} className="bg-info-700" />
        </div>
      )}

      {total === 0 ? (
        <p className="py-6 text-center text-body-sm text-neutral-500">{emptyMessage}</p>
      ) : (
        // Tinggi terkunci (~ setara chart cash flow) + scroll; `pr-1` memberi ruang
        // untuk scrollbar agar teks tidak tertutup.
        <ul className="max-h-[280px] divide-y divide-neutral-100 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
          {items.map((item) => {
            const content = <RowContent item={item} />;
            const inner = <div className="flex flex-col gap-1 py-2">{content}</div>;
            return (
              <li key={item.key}>
                {renderRow ? renderRow(item, inner) : <div className="px-0">{inner}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
