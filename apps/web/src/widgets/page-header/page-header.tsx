import * as React from 'react';
import { cn } from '@aec/ui';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Chip scope (mis. entity, periode) yang muncul di bawah judul. */
  scope?: React.ReactNode;
  /** Aksi di kanan (reload, export, saved views). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Header halaman gaya dynamic-page: judul + subjudul + scope + aksi, lalu garis
 * pemisah. Satu tempat untuk konteks halaman sehingga halaman tidak lagi
 * "mengambang" tanpa identitas sistem.
 */
export function PageHeader({ title, subtitle, scope, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-3', className)}>
      <div className="min-w-0">
        <h1 className="text-h1 text-neutral-950">{title}</h1>
        {subtitle && <p className="mt-0.5 text-body-sm text-neutral-500">{subtitle}</p>}
        {scope && <div className="mt-2 flex flex-wrap items-center gap-2">{scope}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Chip scope ringkas (mis. "AEC Group", "FY2026 · Q1"). */
export function ScopeChip({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded border border-neutral-300 px-2 text-caption text-neutral-600',
        mono && 'font-mono tabular-nums',
      )}
    >
      {children}
    </span>
  );
}
