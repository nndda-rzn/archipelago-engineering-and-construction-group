import type { Portfolio } from '@aec/api-contracts';

export type HealthKey = Portfolio['items'][number]['health'];

/**
 * Metadata tampilan per health — sumber tunggal untuk label, dot, dan varian
 * badge. Dipindah dari `widgets/portfolio-spine` agar tidak bergantung pada
 * widget dashboard yang sudah tidak dirender.
 */
export const healthMeta: Record<HealthKey, { label: string; dotClass: string; badgeVariant: 'default' | 'success' | 'warning' }> = {
  NO_BUDGET: { label: 'No Budget', dotClass: 'bg-neutral-400', badgeVariant: 'default' },
  ON_TRACK: { label: 'On Track', dotClass: 'bg-project-on-track-500', badgeVariant: 'success' },
  AT_RISK: { label: 'At Risk', dotClass: 'bg-project-at-risk-500', badgeVariant: 'warning' },
  CRITICAL: { label: 'Critical', dotClass: 'bg-project-critical-500', badgeVariant: 'warning' },
};
