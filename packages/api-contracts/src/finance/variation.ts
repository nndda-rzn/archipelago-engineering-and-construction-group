import { z } from 'zod';
import { paginatedResponseSchema } from '../core';

export const variationSchema = z.object({
  id: z.string(),
  variationNumber: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  amountChange: z.number(),
  scheduleImpactDays: z.number().nullable(),
  status: z.string(),
  createdBy: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedBy: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
});
export type Variation = z.infer<typeof variationSchema>;

export const createVariationSchema = z.object({
  projectId: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  type: z.enum(['ADDITIVE', 'DEDUCTIVE']).optional(),
  amountChange: z.number().min(0.01),
  scheduleImpactDays: z.number().int().min(-3650).max(3650).optional(),
});
export type CreateVariation = z.infer<typeof createVariationSchema>;

export const variationListResponseSchema = paginatedResponseSchema(variationSchema);
export type VariationListResponse = z.infer<typeof variationListResponseSchema>;
