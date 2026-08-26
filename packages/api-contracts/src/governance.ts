import { z } from 'zod';

export const riskSchema = z.object({
  id: z.string(),
  riskNumber: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  category: z.string(),
  likelihood: z.number(),
  impact: z.number(),
  score: z.number(),
  owner: z.string(),
  mitigation: z.string().nullable(),
  residualLikelihood: z.number().nullable(),
  residualImpact: z.number().nullable(),
  residualScore: z.number().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string() }).nullable().optional(),
});
export type Risk = z.infer<typeof riskSchema>;

export const createRiskSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(3).max(300),
  category: z.enum(['FINANCIAL', 'TECHNICAL', 'SCHEDULE', 'HSE', 'COMMERCIAL', 'OTHER']).optional(),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  owner: z.string().min(2).max(200),
  mitigation: z.string().max(1000).optional(),
});
export type CreateRisk = z.infer<typeof createRiskSchema>;

export const auditFindingSchema = z.object({
  id: z.string(),
  auditId: z.string(),
  title: z.string(),
  severity: z.string(),
  response: z.string().nullable(),
  correctiveAction: z.string().nullable(),
  followUpDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AuditFinding = z.infer<typeof auditFindingSchema>;

export const auditEngagementSchema = z.object({
  id: z.string(),
  auditNumber: z.string(),
  title: z.string(),
  scope: z.string().nullable(),
  status: z.string(),
  plannedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  auditor: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  findings: z.array(auditFindingSchema).optional(),
});
export type AuditEngagement = z.infer<typeof auditEngagementSchema>;

export const createAuditSchema = z.object({
  title: z.string().min(3).max(200),
  scope: z.string().max(1000).optional(),
});
export type CreateAudit = z.infer<typeof createAuditSchema>;

export const legalCaseSchema = z.object({
  id: z.string(),
  caseNumber: z.string(),
  projectId: z.string().nullable(),
  legalEntityId: z.string().nullable(),
  title: z.string(),
  caseType: z.string(),
  counterpart: z.string().nullable(),
  status: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string() }).nullable().optional(),
});
export type LegalCase = z.infer<typeof legalCaseSchema>;

export const createLegalCaseSchema = z.object({
  projectId: z.string().optional(),
  legalEntityId: z.string().optional(),
  title: z.string().min(3).max(200),
  caseType: z.enum(['CONTRACT', 'LABOR', 'REGULATORY', 'TAX', 'OTHER']).optional(),
  counterpart: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});
export type CreateLegalCase = z.infer<typeof createLegalCaseSchema>;

export const accessReviewSchema = z.object({
  id: z.string(),
  reviewNumber: z.string(),
  period: z.string(),
  status: z.string(),
  notes: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AccessReview = z.infer<typeof accessReviewSchema>;

export const createAccessReviewSchema = z.object({
  period: z.string().length(7),
});
export type CreateAccessReview = z.infer<typeof createAccessReviewSchema>;
