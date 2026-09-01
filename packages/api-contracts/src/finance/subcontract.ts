import { z } from 'zod';
import { paginatedResponseSchema } from '../core';

export const subcontractSchema = z.object({
  id: z.string(),
  subconNumber: z.string(),
  projectId: z.string(),
  vendor: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  contractValue: z.number(),
  currency: z.string(),
  status: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
});
export type Subcontract = z.infer<typeof subcontractSchema>;

export const createSubcontractSchema = z.object({
  projectId: z.string(),
  vendor: z.string().min(2).max(200),
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  contractValue: z.number().min(0.01),
  currency: z.string().length(3).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateSubcontract = z.infer<typeof createSubcontractSchema>;

export const subcontractProgressSchema = z.object({
  id: z.string(),
  subcontractId: z.string(),
  period: z.string().nullable(),
  progressDate: z.string(),
  progressPercent: z.number(),
  verifiedAmount: z.number(),
  status: z.string(),
  verifiedBy: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SubcontractProgress = z.infer<typeof subcontractProgressSchema>;

export const createSubcontractProgressSchema = z.object({
  subcontractId: z.string().optional(),
  period: z.string().max(30).optional(),
  progressDate: z.string().optional(),
  progressPercent: z.number().min(0.01).max(100),
  remark: z.string().max(500).optional(),
});
export type CreateSubcontractProgress = z.infer<typeof createSubcontractProgressSchema>;

export const subcontractListResponseSchema = paginatedResponseSchema(subcontractSchema);
export type SubcontractListResponse = z.infer<typeof subcontractListResponseSchema>;
