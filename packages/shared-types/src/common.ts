/** Identifier umum dengan prefix domain, mis. "PRJ-EPC-2027-014". */
export type DocumentNumber = string;

/** ISO 4217 currency code. */
export type CurrencyCode = string;

/** Primary key / resource id. */
export type Id = string;

/** Audit-aware entity — PRD §28. */
export interface Auditable {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/** Soft-delete flag — PRD §15.3. */
export interface SoftDeletable {
  deletedAt?: Date | null;
}
