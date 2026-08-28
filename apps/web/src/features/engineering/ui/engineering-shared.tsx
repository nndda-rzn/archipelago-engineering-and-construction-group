import type { BadgeVariant } from '@aec/ui';
import { formatDate } from '@/shared/lib/format';

export type EngStatus = 'ISSUED' | 'APPROVED' | 'PUBLISHED' | 'ANSWERED' | 'CLOSED' | 'REJECTED' | 'OPEN' | 'SUBMITTED';

export const engStatusVariant: Record<EngStatus, BadgeVariant> = {
  ISSUED: 'success',
  APPROVED: 'success',
  PUBLISHED: 'success',
  ANSWERED: 'success',
  CLOSED: 'success',
  REJECTED: 'warning',
  OPEN: 'warning',
  SUBMITTED: 'default',
};

export function EngDateCell({ value }: { value?: string | null }) {
  return <span className="font-mono text-neutral-600">{formatDate(value)}</span>;
}
