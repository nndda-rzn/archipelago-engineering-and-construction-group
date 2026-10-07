import * as React from 'react';
import { cn } from '../lib/cn';

export type CardVariant = 'panel' | 'panel-inset' | 'flat';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * `panel` (default) — kartu permukaan terangkat: border + surface raised.
   * `panel-inset` — well di dalam kartu: latar sunken, tanpa border luar.
   * `flat` — tanpa border/latar; hanya wadah.
   */
  variant?: CardVariant;
}

const VARIANT: Record<CardVariant, string> = {
  panel: 'rounded-md border border-neutral-200 bg-surface-raised p-4 shadow-xs',
  'panel-inset': 'rounded-md bg-surface-sunken p-3',
  flat: '',
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant = 'panel', ...props }, ref) => (
  <div ref={ref} className={cn(VARIANT[variant], className)} {...props} />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-3 flex flex-col gap-1', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-h3 text-neutral-950', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export { Card, CardHeader, CardTitle };
