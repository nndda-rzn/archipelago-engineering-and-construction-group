import { z } from 'zod';
import { paginatedResponseSchema } from './core';

// ─── Foundation/Domain Hardening (Fase 11F) ──────────────────────────────────

export const organizationSchema = z.object({
  id: z.string(),
  legalEntityId: z.string(),
  name: z.string(),
  orgType: z.string(),
  parentId: z.string().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  status: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const createOrganizationSchema = z.object({
  legalEntityId: z.string(),
  name: z.string().min(1).max(200),
  orgType: z.enum(['GROUP', 'LEGAL_ENTITY', 'BUSINESS_UNIT', 'DIVISION', 'REGION', 'BRANCH', 'DEPARTMENT', 'SECTION']),
  parentId: z.string().optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
});
export type CreateOrganization = z.infer<typeof createOrganizationSchema>;

export const doaRuleSchema = z.object({
  id: z.string(),
  transactionType: z.string(),
  legalEntityId: z.string().nullable(),
  businessUnit: z.string().nullable(),
  projectId: z.string().nullable(),
  currencyCode: z.string().nullable(),
  amountFrom: z.number().nullable(),
  amountTo: z.number().nullable(),
  riskLevel: z.string().nullable(),
  approverLevel: z.string(),
  approverRoleCode: z.string().nullable(),
  approvalMode: z.string(),
  priority: z.number(),
  status: z.string(),
});
export type DoaRule = z.infer<typeof doaRuleSchema>;

export const createDoaRuleSchema = z.object({
  transactionType: z.string().min(1).max(100),
  legalEntityId: z.string().optional(),
  businessUnit: z.string().optional(),
  projectId: z.string().optional(),
  currencyCode: z.string().length(3).optional(),
  amountFrom: z.number().optional(),
  amountTo: z.number().optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  approverLevel: z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']),
  approverRoleCode: z.string().max(100).optional(),
  approvalMode: z.enum(['SEQUENTIAL', 'PARALLEL']).optional(),
  priority: z.number().int().optional(),
});
export type CreateDoaRule = z.infer<typeof createDoaRuleSchema>;

export const resolveDoaSchema = z.object({
  transactionType: z.string(),
  amount: z.number(),
  matchedRules: z.number(),
  resolved: z.object({
    ruleId: z.string(),
    approverLevel: z.string(),
    approverRoleCode: z.string().nullable(),
    approvalMode: z.string(),
    priority: z.number(),
  }).nullable(),
  generatedAt: z.string(),
});
export type ResolveDoa = z.infer<typeof resolveDoaSchema>;

export const resolveDoaInputSchema = z.object({
  transactionType: z.string(),
  legalEntityId: z.string().optional(),
  businessUnit: z.string().optional(),
  projectId: z.string().optional(),
  amount: z.number().optional(),
  currencyCode: z.string().length(3).optional(),
  riskLevel: z.string().optional(),
});
export type ResolveDoaInput = z.infer<typeof resolveDoaInputSchema>;

export const currencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  isActive: z.boolean(),
});
export type Currency = z.infer<typeof currencySchema>;

export const createCurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1).max(100),
  symbol: z.string().max(10).optional(),
  decimals: z.number().int().min(0).max(6).optional(),
});
export type CreateCurrency = z.infer<typeof createCurrencySchema>;

export const exchangeRateSchema = z.object({
  id: z.string(),
  fromCurrencyId: z.string(),
  toCurrencyId: z.string(),
  rateType: z.string(),
  rate: z.number(),
  effectiveDate: z.string(),
  fromCurrency: z.object({ code: z.string() }),
  toCurrency: z.object({ code: z.string() }),
});
export type ExchangeRate = z.infer<typeof exchangeRateSchema>;

export const createExchangeRateSchema = z.object({
  fromCurrencyId: z.string(),
  toCurrencyId: z.string(),
  rateType: z.enum(['SPOT', 'MONTHLY', 'PERIOD_END']),
  rate: z.number().min(0),
  effectiveDate: z.string().optional(),
});
export type CreateExchangeRate = z.infer<typeof createExchangeRateSchema>;

export const revalueSchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.number(),
  rate: z.number().nullable(),
  rateType: z.string().optional(),
  converted: z.number().nullable(),
  note: z.string().optional(),
  asOf: z.string(),
});
export type Revalue = z.infer<typeof revalueSchema>;

export const ifcDrawingSchema = z.object({
  id: z.string(),
  drawingNumber: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  discipline: z.string(),
  currentRevision: z.string(),
  isIFC: z.boolean(),
  status: z.string(),
});
export type IfcDrawing = z.infer<typeof ifcDrawingSchema>;

export const ifcListSchema = z.object({
  projectId: z.string(),
  total: z.number(),
  items: z.array(ifcDrawingSchema),
});
export type IfcList = z.infer<typeof ifcListSchema>;

export const readinessSchema = z.object({
  wpId: z.string(),
  wpNumber: z.string(),
  requiresIFC: z.boolean(),
  currentIfcCount: z.number(),
  ready: z.boolean(),
  readyStatus: z.string(),
});
export type Readiness = z.infer<typeof readinessSchema>;
