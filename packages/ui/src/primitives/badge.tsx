import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Badge — compact. Satu ukuran default. Full radius (pill).
 * Aksesibilitas: teks + warna + icon wajib (NFR-A11Y-001).
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'success-filled';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-neutral-100 text-neutral-700',
  outline: 'border border-neutral-300 text-neutral-600',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  destructive: 'bg-destructive-50 text-destructive-700',
  info: 'bg-info-50 text-info-700',
  muted: 'bg-neutral-100 text-neutral-500',
  'success-filled': 'bg-success-500 text-white',
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };