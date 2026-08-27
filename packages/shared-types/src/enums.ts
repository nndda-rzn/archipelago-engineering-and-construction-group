/**
 * Transaction state standards — PRD §12.
 * Dikontrol oleh domain masing-masing.
 */
export type TransactionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'RETURNED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RELEASED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

/** Financial transaction states — PRD §12.2 */
export type FinancialStatus = 'DRAFT' | 'APPROVED' | 'POSTED' | 'REVERSED';

/** Master data states — PRD §12.3 */
export type MasterDataStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'INACTIVE'
  | 'ARCHIVED';

/** Fiscal period states — FR-FND-010 */
export type FiscalPeriodStatus = 'FUTURE' | 'OPEN' | 'SOFT_CLOSED' | 'CLOSED' | 'LOCKED';

/** Estimate status — FR-COM-003 */
export type EstimateStatus =
  | 'WORKING'
  | 'REVIEW'
  | 'APPROVED'
  | 'SUPERSEDED'
  | 'FINAL_BID'
  | 'AWARD_RECONCILED';
