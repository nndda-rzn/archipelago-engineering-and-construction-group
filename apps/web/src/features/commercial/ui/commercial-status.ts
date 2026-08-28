import type { BadgeVariant } from '@aec/ui';

export type CommercialStatus = 'ACTIVE' | 'OPEN' | 'DRAFT' | 'EXECUTED' | 'WON' | 'LOST' | 'COMPLETED' | 'TERMINATED';

export const commercialStatusVariant: Record<CommercialStatus, BadgeVariant> = {
  ACTIVE: 'success',
  OPEN: 'success',
  DRAFT: 'default',
  EXECUTED: 'success',
  WON: 'success',
  LOST: 'warning',
  COMPLETED: 'success',
  TERMINATED: 'warning',
};