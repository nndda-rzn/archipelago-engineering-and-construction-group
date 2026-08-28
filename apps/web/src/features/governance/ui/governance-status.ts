import { type BadgeVariant } from '@aec/ui';

export type GovernanceStatus = 'OPEN' | 'MITIGATED' | 'CLOSED' | 'PLANNED' | 'FIELDWORK' | 'FINDINGS' | 'COMPLETED' | 'SETTLED' | 'WON' | 'LOST' | 'IN_PROGRESS' | 'SCHEDULED';

export const statusVariant: Record<GovernanceStatus, BadgeVariant> = {
  OPEN: 'warning',
  MITIGATED: 'default',
  CLOSED: 'success',
  PLANNED: 'default',
  FIELDWORK: 'default',
  FINDINGS: 'warning',
  COMPLETED: 'success',
  SETTLED: 'success',
  WON: 'success',
  LOST: 'warning',
  IN_PROGRESS: 'default',
  SCHEDULED: 'default',
};
