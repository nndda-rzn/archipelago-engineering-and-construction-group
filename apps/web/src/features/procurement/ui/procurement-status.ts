import type { BadgeVariant } from '@aec/ui';

export type ProcurementStatus = 'APPROVED' | 'REJECTED' | 'PASS' | 'REJECT' | 'PENDING' | 'DRAFT';

export const statusVariant: Record<ProcurementStatus, BadgeVariant> = {
  APPROVED: 'success',
  REJECTED: 'warning',
  PASS: 'success',
  REJECT: 'warning',
  PENDING: 'default',
  DRAFT: 'default',
};