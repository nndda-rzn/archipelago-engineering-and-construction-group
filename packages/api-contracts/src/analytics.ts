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
