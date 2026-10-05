import { z } from 'zod';

export const executiveDashboardSchema = z.object({
  projects: z.object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number()),
    totalContractValue: z.number(),
    totalAdvance: z.number(),
  }),
  finance: z.object({
    totalBudget: z.number(),
    postedVendorInvoice: z.number(),
    postedClientInvoice: z.number(),
    cashIn: z.number(),
    cashOut: z.number(),
  }),
  operational: z.object({
    openClaims: z.number(),
    openNcrs: z.number(),
    openIncidents: z.number(),
    overduePm: z.number(),
    openPunchItems: z.number(),
  }),
  delta: z.record(z.string(), z.object({
    current: z.number(),
    previous: z.number(),
    pctChange: z.number().nullable(),
    direction: z.enum(['up', 'down', 'flat']),
  })).optional(),
  generatedAt: z.string(),
});
export type ExecutiveDashboard = z.infer<typeof executiveDashboardSchema>;

export const anomalySchema = z.object({
  type: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  projectCode: z.string().optional(),
  message: z.string(),
});
export type Anomaly = z.infer<typeof anomalySchema>;

export const anomalyListSchema = z.object({
  anomalies: z.array(anomalySchema),
  total: z.number(),
  generatedAt: z.string(),
});
export type AnomalyList = z.infer<typeof anomalyListSchema>;

export const cashFlowSeriesSchema = z.object({
  month: z.string(),
  cashIn: z.number(),
  cashOut: z.number(),
  net: z.number(),
});
export type CashFlowSeries = z.infer<typeof cashFlowSeriesSchema>;

export const cashFlowSchema = z.object({
  series: z.array(cashFlowSeriesSchema),
  totalCashIn: z.number(),
  totalCashOut: z.number(),
  netCash: z.number(),
  generatedAt: z.string(),
});
export type CashFlow = z.infer<typeof cashFlowSchema>;

export const agingBucketSchema = z.object({
  bucket: z.string(),
  amount: z.number(),
});
export type AgingBucket = z.infer<typeof agingBucketSchema>;

export const agingSchema = z.object({
  ar: z.array(agingBucketSchema),
  ap: z.array(agingBucketSchema),
  generatedAt: z.string(),
});
export type Aging = z.infer<typeof agingSchema>;

export const projectCostSummaryItemSchema = z.object({
  projectCode: z.string(),
  projectName: z.string(),
  contractValue: z.number(),
  budget: z.number(),
  cost: z.number(),
  revenue: z.number(),
  margin: z.number(),
  budgetUsagePct: z.number(),
});
export type ProjectCostSummaryItem = z.infer<typeof projectCostSummaryItemSchema>;

export const projectCostSummarySchema = z.object({
  items: z.array(projectCostSummaryItemSchema),
  generatedAt: z.string(),
});
export type ProjectCostSummary = z.infer<typeof projectCostSummarySchema>;

export const analyticsFilterParamsSchema = z.object({
  legalEntityId: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type AnalyticsFilterParams = z.infer<typeof analyticsFilterParamsSchema>;

export const signalSchema = z.object({
  key: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  count: z.number(),
  oldestAgeDays: z.number(),
  label: z.string(),
  to: z.string(),
});
export type Signal = z.infer<typeof signalSchema>;

export const signalListSchema = z.object({
  signals: z.array(signalSchema),
  generatedAt: z.string(),
});
export type SignalList = z.infer<typeof signalListSchema>;

export const costCompositionSchema = z.object({
  items: z.array(z.object({ costType: z.string(), amount: z.number() })),
  total: z.number(),
  generatedAt: z.string(),
});
export type CostComposition = z.infer<typeof costCompositionSchema>;
