import { z } from 'zod';

export const clientSchema = z.object({
  id: z.string(),
  clientCode: z.string(),
  name: z.string(),
  industry: z.string().nullable(),
  contactPerson: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  country: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Client = z.infer<typeof clientSchema>;

export const createClientSchema = z.object({
  name: z.string().min(2).max(200),
  industry: z.string().max(100).optional(),
  contactPerson: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  country: z.string().length(2).optional(),
});
export type CreateClient = z.infer<typeof createClientSchema>;

export const opportunitySchema = z.object({
  id: z.string(),
  oppNumber: z.string(),
  clientId: z.string(),
  title: z.string(),
  stage: z.string(),
  probability: z.number(),
  expectedValue: z.number(),
  expectedDate: z.string().nullable(),
  owner: z.string(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  client: z.object({ name: z.string() }).optional(),
});
export type Opportunity = z.infer<typeof opportunitySchema>;

export const createOpportunitySchema = z.object({
  clientId: z.string(),
  title: z.string().min(3).max(200),
  stage: z.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedValue: z.number().min(0),
  expectedDate: z.string().optional(),
  owner: z.string().min(2).max(200),
  currency: z.string().length(3).optional(),
});
export type CreateOpportunity = z.infer<typeof createOpportunitySchema>;

export const contractSchema = z.object({
  id: z.string(),
  contractNumber: z.string(),
  projectId: z.string().nullable(),
  clientId: z.string(),
  opportunityId: z.string().nullable(),
  contractType: z.string(),
  title: z.string(),
  value: z.number(),
  advanceTerm: z.number(),
  retentionTerm: z.number(),
  signedDate: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  client: z.object({ name: z.string() }).optional(),
  project: z.object({ code: z.string() }).optional(),
});
export type Contract = z.infer<typeof contractSchema>;

export const createContractSchema = z.object({
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  opportunityId: z.string().optional(),
  contractType: z.enum(['LUMP_SUM', 'UNIT_PRICE', 'COST_PLUS', 'TIME_MATERIAL']).optional(),
  title: z.string().min(3).max(200),
  value: z.number().min(0.01),
  advanceTerm: z.number().min(0).max(100).optional(),
  retentionTerm: z.number().min(0).max(100).optional(),
  signedDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateContract = z.infer<typeof createContractSchema>;
