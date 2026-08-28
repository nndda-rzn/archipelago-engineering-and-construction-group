import type { BadgeVariant } from '@aec/ui';

export type QualityStatus = 'OPEN' | 'PASS' | 'FAIL' | 'CLOSED' | 'DISPOSED' | 'DRAFT';

export const statusVariant: Record<QualityStatus, BadgeVariant> = {
  OPEN: 'warning',
  PASS: 'success',
  FAIL: 'warning',
  CLOSED: 'success',
  DISPOSED: 'success',
  DRAFT: 'default',
};
