import { z } from 'zod';

export const chartOfAccountSchema = z.object({
  id: z.string(),
  legalEntityId: z.string(),
  code: z.string(),
  name: z.string(),
  accountType: z.string(),
  normalBalance: z.string(),
  parentId: z.string().nullable(),
  isActive: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  parent: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
});
export type ChartOfAccount = z.infer<typeof chartOfAccountSchema>;

export const createChartOfAccountSchema = z.object({
  legalEntityId: z.string(),
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  accountType: z.string().optional(),
  normalBalance: z.string().optional(),
  parentId: z.string().optional(),
  description: z.string().max(300).optional(),
});
export type CreateChartOfAccount = z.infer<typeof createChartOfAccountSchema>;

export const trialBalanceSchema = z.object({
  legalEntityId: z.string(),
  legalEntityCode: z.string(),
  generatedAt: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  totalDebit: z.number(),
  totalCredit: z.number(),
  balanced: z.boolean(),
  lines: z.array(z.object({
    accountId: z.string(),
    code: z.string(),
    name: z.string(),
    accountType: z.string(),
    normalBalance: z.string(),
    debit: z.number(),
    credit: z.number(),
    balance: z.number(),
  })),
});
export type TrialBalance = z.infer<typeof trialBalanceSchema>;
