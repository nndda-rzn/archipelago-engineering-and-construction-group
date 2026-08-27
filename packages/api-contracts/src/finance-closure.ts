import { z } from 'zod';
import { paginatedResponseSchema } from './core';

// ─── Finance Closure (Fase 11D, FR-FIN-009..012) ─────────────────────────────

export const intercompanySchema = z.object({
  id: z.string(),
  transactionNumber: z.string(),
  fromEntityId: z.string(),
  toEntityId: z.string(),
  amount: z.number(),
  currency: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  postedAt: z.string().nullable(),
  fromEntity: z.object({ code: z.string() }),
  toEntity: z.object({ code: z.string() }),
});
export type Intercompany = z.infer<typeof intercompanySchema>;

export const intercompanyListResponseSchema = paginatedResponseSchema(intercompanySchema);
export type IntercompanyListResponse = z.infer<typeof intercompanyListResponseSchema>;

export const createIntercompanySchema = z.object({
  fromEntityId: z.string(),
  toEntityId: z.string(),
  amount: z.number().min(0.01),
  currency: z.string().length(3).optional(),
  description: z.string().max(1000).optional(),
});
export type CreateIntercompany = z.infer<typeof createIntercompanySchema>;

export const intercompanyReconciliationSchema = z.object({
  items: z.array(
    z.object({
      fromCode: z.string(),
      toCode: z.string(),
      count: z.number(),
      amount: z.number(),
      reciprocalAmount: z.number(),
      reconciled: z.boolean(),
    }),
  ),
  total: z.number(),
  generatedAt: z.string(),
});
export type IntercompanyReconciliation = z.infer<typeof intercompanyReconciliationSchema>;

export const periodCloseSchema = z.object({
  id: z.string(),
  legalEntityId: z.string(),
  period: z.string(),
  status: z.string(),
  steps: z.unknown().nullable(),
  journalCount: z.number(),
  closedBy: z.string().nullable(),
  closedAt: z.string().nullable(),
  legalEntity: z.object({ code: z.string() }),
});
export type PeriodClose = z.infer<typeof periodCloseSchema>;

export const createPeriodCloseSchema = z.object({
  legalEntityId: z.string(),
  period: z.string().min(1),
});
export type CreatePeriodClose = z.infer<typeof createPeriodCloseSchema>;

export const financialStatementSchema = z.object({
  legalEntityId: z.string(),
  legalEntityCode: z.string(),
  legalName: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  generatedAt: z.string(),
});

export const incomeStatementSchema = financialStatementSchema.extend({
  revenue: z.array(z.object({ accountId: z.string(), code: z.string(), name: z.string(), accountType: z.string(), debit: z.number(), credit: z.number(), balance: z.number(), amount: z.number() })),
  expenses: z.array(z.object({ accountId: z.string(), code: z.string(), name: z.string(), accountType: z.string(), debit: z.number(), credit: z.number(), balance: z.number(), amount: z.number() })),
  totalRevenue: z.number(),
  totalExpense: z.number(),
  netIncome: z.number(),
});
export type IncomeStatement = z.infer<typeof incomeStatementSchema>;

export const balanceSheetSchema = financialStatementSchema.extend({
  assets: z.array(z.object({ accountId: z.string(), code: z.string(), name: z.string(), accountType: z.string(), debit: z.number(), credit: z.number(), balance: z.number(), amount: z.number() })),
  liabilities: z.array(z.object({ accountId: z.string(), code: z.string(), name: z.string(), accountType: z.string(), debit: z.number(), credit: z.number(), balance: z.number(), amount: z.number() })),
  equities: z.array(z.object({ accountId: z.string(), code: z.string(), name: z.string(), accountType: z.string(), debit: z.number(), credit: z.number(), balance: z.number(), amount: z.number() })),
  totalAsset: z.number(),
  totalLiability: z.number(),
  totalEquity: z.number(),
  totalLiabEquity: z.number(),
  balanced: z.boolean(),
});
export type BalanceSheet = z.infer<typeof balanceSheetSchema>;

export const consolidationSchema = z.object({
  entities: z.array(
    z.object({
      entityCode: z.string(),
      legalName: z.string(),
      totalAsset: z.number(),
      totalLiability: z.number(),
      totalEquity: z.number(),
      totalRevenue: z.number(),
      totalExpense: z.number(),
    }),
  ),
  elimination: z.number(),
  totals: z.object({
    totalAsset: z.number(),
    totalLiability: z.number(),
    totalEquity: z.number(),
    totalRevenue: z.number(),
    totalExpense: z.number(),
    netIncome: z.number(),
  }),
  balanced: z.boolean(),
  generatedAt: z.string(),
});
export type Consolidation = z.infer<typeof consolidationSchema>;
