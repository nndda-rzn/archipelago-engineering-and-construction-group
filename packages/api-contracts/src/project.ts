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