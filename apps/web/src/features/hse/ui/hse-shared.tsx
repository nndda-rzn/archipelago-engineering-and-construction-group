import type { BadgeVariant } from '@aec/ui';

export type HseSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const severityVariant: Record<HseSeverity, BadgeVariant> = {
  LOW: 'success',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'warning',
};

export function HseDateCell({ value }: { value: string }) {
  return <span className="font-mono text-neutral-600">{new Date(value).toLocaleDateString('id-ID')}</span>;
}
