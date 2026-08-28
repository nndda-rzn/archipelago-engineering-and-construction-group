import type { BadgeVariant } from '@aec/ui';
import { formatDate } from '@/shared/lib/format';

export type HseSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const severityVariant: Record<HseSeverity, BadgeVariant> = {
  LOW: 'success',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'warning',
};

export function HseDateCell({ value }: { value: string }) {
  return <span className="font-mono text-neutral-600">{formatDate(value)}</span>;
}
