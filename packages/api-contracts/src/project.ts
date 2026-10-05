import { z } from 'zod';
import { paginatedResponseSchema } from './core';

export const projectSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  client: z.string(),
  legalEntityId: z.string(),
  businessUnit: z.string().nullable(),
  location: z.string().nullable(),
  currency: z.string(),
  contractValue: z.number().nullable(),
  advanceAmount: z.number().nullable().optional(),
  advanceRecoveryRate: z.number().nullable().optional(),
  startDate: z.string().nullable(),
  completionDate: z.string().nullable(),
  director: z.string().nullable(),
  manager: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const projectListResponseSchema = paginatedResponseSchema(projectSchema);
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;

export const createProjectSchema = z.object({
  code: z.string().min(3).max(30),
  name: z.string().min(3).max(200),
  client: z.string().min(2).max(200),
  legalEntityId: z.string(),
  businessUnit: z.string().optional(),
  location: z.string().optional(),
  currency: z.string().length(3).optional(),
  contractValue: z.number().optional(),
  advanceAmount: z.number().optional(),
  advanceRecoveryRate: z.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),
  director: z.string().optional(),
  manager: z.string().optional(),
});
export type CreateProject = z.infer<typeof createProjectSchema>;

export const projectHealthSchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  projectName: z.string(),
  client: z.string(),
  legalEntityCode: z.string(),
  contractValue: z.number(),
  totalBudget: z.number(),
  totalActual: z.number(),
  revenue: z.number(),
  variance: z.number(),
  utilization: z.number().nullable(),
  health: z.enum(['NO_BUDGET', 'ON_TRACK', 'AT_RISK', 'CRITICAL']),
  generatedAt: z.string(),
  wbs: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      budget: z.number(),
      actual: z.number(),
      variance: z.number(),
      utilization: z.number().nullable(),
    }),
  ),
});
export type ProjectHealth = z.infer<typeof projectHealthSchema>;

export const portfolioSchema = z.object({
  generatedAt: z.string(),
  totals: z.object({
    projectCount: z.number(),
    totalContract: z.number(),
    totalBudget: z.number(),
    totalActual: z.number(),
    totalRevenue: z.number(),
    totalVariance: z.number(),
  }),
  healthCounts: z.object({
    NO_BUDGET: z.number(),
    ON_TRACK: z.number(),
    AT_RISK: z.number(),
    CRITICAL: z.number(),
  }),
  items: z.array(
    z.object({
      projectId: z.string(),
      projectCode: z.string(),
      projectName: z.string(),
      client: z.string(),
      status: z.string(),
      contractValue: z.number(),
      budget: z.number(),
      actual: z.number(),
      revenue: z.number(),
      variance: z.number(),
      utilization: z.number().nullable(),
      health: z.enum(['NO_BUDGET', 'ON_TRACK', 'AT_RISK', 'CRITICAL']),
    }),
  ),
});
export type Portfolio = z.infer<typeof portfolioSchema>;

export const portfolioFilterParamsSchema = z.object({
  legalEntityId: z.string().optional(),
});
export type PortfolioFilterParams = z.infer<typeof portfolioFilterParamsSchema>;

export const wbsItemSchema: z.ZodType<{
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  children: WbsItem[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    sortOrder: z.number(),
    children: wbsItemSchema.array(),
  }),
);
export type WbsItem = z.infer<typeof wbsItemSchema>;

export const createWbsItemSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
});
export type CreateWbsItem = z.infer<typeof createWbsItemSchema>;

export const budgetSummarySchema = z.object({
  projectId: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  wbs: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      budget: z.number(),
      itemCount: z.number(),
    }),
  ),
  totalBudget: z.number(),
});
export type BudgetSummary = z.infer<typeof budgetSummarySchema>;

export const upsertBudgetSchema = z.object({
  wbsItemId: z.string(),
  costType: z.string().optional(),
  amount: z.number().min(0),
});
export type UpsertBudget = z.infer<typeof upsertBudgetSchema>;

export const costCodeSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  wbsItemId: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  costType: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  wbsItem: z.object({ code: z.string(), name: z.string() }).nullable(),
});
export type CostCode = z.infer<typeof costCodeSchema>;

export const costCodeListResponseSchema = paginatedResponseSchema(costCodeSchema);
export type CostCodeListResponse = z.infer<typeof costCodeListResponseSchema>;

export const createCostCodeSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  wbsItemId: z.string().optional(),
  costType: z.enum(['DIRECT', 'INDIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'OVERHEAD']).optional(),
});
export type CreateCostCode = z.infer<typeof createCostCodeSchema>;

export const controlAccountSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  wbsItemId: z.string(),
  code: z.string(),
  name: z.string(),
  responsibleManager: z.string(),
  budgetAmount: z.number(),
  plannedValue: z.number(),
  scheduleStart: z.string().nullable(),
  scheduleEnd: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  wbsItem: z.object({ code: z.string(), name: z.string() }),
});
export type ControlAccount = z.infer<typeof controlAccountSchema>;

export const controlAccountListResponseSchema = paginatedResponseSchema(controlAccountSchema);
export type ControlAccountListResponse = z.infer<typeof controlAccountListResponseSchema>;

export const createControlAccountSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  wbsItemId: z.string(),
  responsibleManager: z.string().min(1).max(200),
  budgetAmount: z.number().optional(),
  plannedValue: z.number().optional(),
  scheduleStart: z.string().optional(),
  scheduleEnd: z.string().optional(),
});
export type CreateControlAccount = z.infer<typeof createControlAccountSchema>;

export const commitmentSchema = z.object({
  projectId: z.string(),
  poCommitment: z.number(),
  subcontractCommitment: z.number(),
  totalCommitment: z.number(),
  totalBudget: z.number(),
  remainingBudget: z.number(),
  generatedAt: z.string(),
});
export type Commitment = z.infer<typeof commitmentSchema>;

export const forecastSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  version: z.number(),
  period: z.string().nullable(),
  estimateAtCompletion: z.number(),
  estimateToComplete: z.number(),
  varianceAtCompletion: z.number(),
  status: z.string(),
  note: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Forecast = z.infer<typeof forecastSchema>;

export const createForecastSchema = z.object({
  period: z.string().min(1),
  estimateAtCompletion: z.number().min(0),
  estimateToComplete: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
});
export type CreateForecast = z.infer<typeof createForecastSchema>;

export const evmSchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  metrics: z.object({
    pv: z.number(),
    ev: z.number(),
    ac: z.number(),
    bac: z.number(),
    progressPercent: z.number(),
    cpi: z.number().nullable(),
    spi: z.number().nullable(),
    cv: z.number(),
    sv: z.number(),
  }),
  interpretation: z.object({
    cpi: z.string(),
    spi: z.string(),
  }),
  generatedAt: z.string(),
});
export type Evm = z.infer<typeof evmSchema>;