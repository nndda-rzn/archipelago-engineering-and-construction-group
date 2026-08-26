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

// ─── Commercial Tender (Fase 11C, FR-COM-002..008) ───────────────────────────

export const bidDecisionSchema = z.object({
  id: z.string(),
  opportunityId: z.string(),
  decision: z.string(),
  rationale: z.string().nullable(),
  decidedBy: z.string(),
  decidedAt: z.string(),
  opportunity: z.object({ oppNumber: z.string(), title: z.string() }).optional(),
});
export type BidDecision = z.infer<typeof bidDecisionSchema>;

export const createBidDecisionSchema = z.object({
  decision: z.enum(['PENDING', 'BID', 'NO_BID']),
  rationale: z.string().max(500).optional(),
});
export type CreateBidDecision = z.infer<typeof createBidDecisionSchema>;

export const estimateSchema = z.object({
  id: z.string(),
  estimateNumber: z.string(),
  opportunityId: z.string(),
  version: z.number(),
  description: z.string().nullable(),
  totalAmount: z.number(),
  status: z.string(),
  createdBy: z.string(),
  pricingScenarios: z.array(
    z.object({
      id: z.string(),
      estimateId: z.string(),
      scenarioType: z.string(),
      amount: z.number(),
      marginPct: z.number(),
      note: z.string().nullable(),
    }),
  ).optional(),
});
export type Estimate = z.infer<typeof estimateSchema>;

export const createEstimateSchema = z.object({
  description: z.string().max(500).optional(),
  totalAmount: z.number().min(0),
});
export type CreateEstimate = z.infer<typeof createEstimateSchema>;

export const createPricingScenarioSchema = z.object({
  scenarioType: z.enum(['BASE', 'AGGRESSIVE', 'TARGET', 'NEGOTIATION_FLOOR', 'BEST_CASE']),
  amount: z.number().min(0),
  marginPct: z.number().min(-100).max(100).optional(),
  note: z.string().max(500).optional(),
});
export type CreatePricingScenario = z.infer<typeof createPricingScenarioSchema>;

export const contractDeviationSchema = z.object({
  id: z.string(),
  opportunityId: z.string(),
  clause: z.string(),
  clientRequirement: z.string(),
  aecPosition: z.string(),
  risk: z.string(),
  owner: z.string(),
  status: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
});
export type ContractDeviation = z.infer<typeof contractDeviationSchema>;

export const createContractDeviationSchema = z.object({
  clause: z.string().min(1).max(200),
  clientRequirement: z.string().min(1).max(1000),
  aecPosition: z.string().min(1).max(1000),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  owner: z.string().min(1).max(200),
});
export type CreateContractDeviation = z.infer<typeof createContractDeviationSchema>;

export const tenderSubmissionSchema = z.object({
  id: z.string(),
  submissionNumber: z.string(),
  opportunityId: z.string(),
  estimateId: z.string().nullable(),
  channel: z.string(),
  packageVersion: z.string().nullable(),
  submittedAt: z.string(),
  submittedBy: z.string(),
  acknowledgement: z.string().nullable(),
  fileHash: z.string().nullable(),
  status: z.string(),
  opportunity: z.object({ oppNumber: z.string(), title: z.string() }).optional(),
  estimate: z.object({ estimateNumber: z.string(), version: z.number() }).nullable().optional(),
});
export type TenderSubmission = z.infer<typeof tenderSubmissionSchema>;

export const createTenderSubmissionSchema = z.object({
  opportunityId: z.string(),
  estimateId: z.string().optional(),
  channel: z.enum(['ELECTRONIC', 'HARDCOPY', 'PORTAL']).optional(),
  packageVersion: z.string().max(100).optional(),
  submittedAt: z.string().optional(),
  acknowledgement: z.string().max(200).optional(),
  fileHash: z.string().max(200).optional(),
});
export type CreateTenderSubmission = z.infer<typeof createTenderSubmissionSchema>;

export const contractAmendmentSchema = z.object({
  id: z.string(),
  amendmentNumber: z.string(),
  contractId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  amountChange: z.number(),
  signedDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ContractAmendment = z.infer<typeof contractAmendmentSchema>;

export const createContractAmendmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  amountChange: z.number(),
  signedDate: z.string().optional(),
});
export type CreateContractAmendment = z.infer<typeof createContractAmendmentSchema>;
