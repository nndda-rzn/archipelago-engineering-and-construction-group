import { z } from 'zod';
import { paginatedResponseSchema } from '../core';

export const progressClaimSchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  projectId: z.string(),
  claimDate: z.string(),
  period: z.string().nullable(),
  description: z.string().nullable(),
  amount: z.number(),
  claimType: z.string(),
  requestedExtensionDays: z.number().nullable().optional(),
  status: z.string(),
  certifiedAmount: z.number().nullable(),
  retentionRate: z.number().nullable().optional(),
  retentionAmount: z.number().nullable().optional(),
  netCertifiedAmount: z.number().nullable().optional(),
  recoveryAmount: z.number().nullable().optional(),
  cumulativeRecovered: z.number().nullable().optional(),
  certifiedBy: z.string().nullable(),
  certifiedAt: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  workPackageId: z.string().nullable().optional(),
  workPackage: z.object({ wpNumber: z.string(), title: z.string() }).nullable().optional(),
  physicalProgressAtClaim: z.number().nullable().optional(),
  billableProgress: z.number().nullable().optional(),
});
export type ProgressClaim = z.infer<typeof progressClaimSchema>;

export const createProgressClaimSchema = z.object({
  projectId: z.string(),
  claimDate: z.string().optional(),
  period: z.string().max(30).optional(),
  description: z.string().max(500).optional(),
  amount: z.number().min(0.01),
  claimType: z.enum(['PROGRESS', 'COST', 'TIME', 'EOT', 'CONTRACTUAL']).optional(),
  requestedExtensionDays: z.number().int().min(1).max(3650).optional(),
  workPackageId: z.string().optional(),
  physicalProgressAtClaim: z.number().min(0).max(100).optional(),
  billableProgress: z.number().min(0).max(100).optional(),
});
export type CreateProgressClaim = z.infer<typeof createProgressClaimSchema>;

export const certifyClaimSchema = z.object({
  certifiedAmount: z.number().min(0),
  retentionRate: z.number().min(0).max(100).optional(),
  remark: z.string().max(500).optional(),
});
export type CertifyClaim = z.infer<typeof certifyClaimSchema>;

export const progressClaimListResponseSchema = paginatedResponseSchema(progressClaimSchema);
export type ProgressClaimListResponse = z.infer<typeof progressClaimListResponseSchema>;
