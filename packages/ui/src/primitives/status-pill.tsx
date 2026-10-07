import * as React from 'react';
import { cn } from '../lib/cn';

export type StatusTone = 'positive' | 'warning' | 'critical' | 'info' | 'neutral';

const TONE_DOT: Record<StatusTone, string> = {
  positive: 'bg-success-700',
  warning: 'bg-warning-700',
  critical: 'bg-destructive-700',
  info: 'bg-info-700',
  neutral: 'bg-neutral-500',
};

const TONE_TEXT: Record<StatusTone, string> = {
  positive: 'text-success-700',
  warning: 'text-warning-700',
  critical: 'text-destructive-700',
  info: 'text-info-700',
  neutral: 'text-neutral-600',
};

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  /** Label yang selalu tampil — warna tidak pernah menjadi satu-satunya penanda. */
  label: string;
  /** Ikon opsional (mis. bentuk berbeda untuk buta warna). */
  icon?: React.ReactNode;
  /** Titik warna. Default true; set false bila ikon sudah membawa makna. */
  dot?: boolean;
}

/**
 * Penanda status satu-satunya di aplikasi: titik/ikon + label + tone token.
 * Warna **tidak pernah** menjadi satu-satunya sinyal (WCAG 1.4.1) — label selalu ada.
 */
export function StatusPill({ tone, label, icon, dot = true, className, ...props }: StatusPillProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-caption font-medium', TONE_TEXT[tone], className)}
      {...props}
    >
      {icon ?? (dot ? <span aria-hidden="true" className={cn('inline-block h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])} /> : null)}
      <span className="truncate">{label}</span>
    </span>
  );
}
