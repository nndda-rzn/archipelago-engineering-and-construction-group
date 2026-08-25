import { z } from 'zod';

// FR-CON-001: Work package
export const workPackageSchema = z.object({
  id: z.string(),
  wpNumber: z.string(),
  projectId: z.string(),
  wbsItemId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  scope: z.string().nullable(),
  plannedQty: z.number(),
  unit: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  wbs: z.object({ code: z.string(), name: z.string() }).optional(),
  latestProgress: z.number().nullable().optional(),
});
export type WorkPackage = z.infer<typeof workPackageSchema>;

export const createWorkPackageSchema = z.object({
  projectId: z.string(),
  wbsItemId: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  scope: z.string().max(500).optional(),
  plannedQty: z.number().min(0.01),
  unit: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateWorkPackage = z.infer<typeof createWorkPackageSchema>;

export const workPackageListResponseSchema = z.object({
  items: z.array(workPackageSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
export type WorkPackageListResponse = z.infer<typeof workPackageListResponseSchema>;

// FR-CON-004: Progress per work package
export const workPackageProgressSchema = z.object({
  id: z.string(),
  workPackageId: z.string(),
  progressDate: z.string(),
  physicalProgress: z.number(),
  achievedQty: z.number(),
  note: z.string().nullable(),
  measuredBy: z.string(),
  createdAt: z.string(),
});
export type WorkPackageProgress = z.infer<typeof workPackageProgressSchema>;

export const createProgressSchema = z.object({
  physicalProgress: z.number().min(0).max(100),
  achievedQty: z.number().min(0),
  note: z.string().max(500).optional(),
  measuredBy: z.string().min(2).max(100),
  progressDate: z.string().optional(),
});
export type CreateProgress = z.infer<typeof createProgressSchema>;
