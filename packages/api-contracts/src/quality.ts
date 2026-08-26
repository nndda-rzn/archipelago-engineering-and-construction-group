import { z } from 'zod';

export const itpSchema = z.object({
  id: z.string(),
  itpNumber: z.string(),
  projectId: z.string().nullable(),
  workPackageId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  workPackage: z.object({ wpNumber: z.string() }).nullable().optional(),
});
export type Itp = z.infer<typeof itpSchema>;

export const createItpSchema = z.object({
  projectId: z.string().optional(),
  workPackageId: z.string().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
});
export type CreateItp = z.infer<typeof createItpSchema>;

export const inspectionRequestSchema = z.object({
  id: z.string(),
  inspectionNumber: z.string(),
  projectId: z.string().nullable(),
  workPackageId: z.string().nullable(),
  itpId: z.string().nullable(),
  description: z.string(),
  result: z.string(),
  status: z.string(),
  inspectedAt: z.string().nullable(),
  inspectedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  workPackage: z.object({ wpNumber: z.string() }).nullable().optional(),
});
export type InspectionRequest = z.infer<typeof inspectionRequestSchema>;

export const createInspectionSchema = z.object({
  projectId: z.string().optional(),
  workPackageId: z.string().optional(),
  itpId: z.string().optional(),
  description: z.string().min(3).max(1000),
});
export type CreateInspection = z.infer<typeof createInspectionSchema>;

export const ncrSchema = z.object({
  id: z.string(),
  ncrNumber: z.string(),
  projectId: z.string().nullable(),
  workPackageId: z.string().nullable(),
  category: z.string(),
  severity: z.string(),
  description: z.string(),
  rootCause: z.string().nullable(),
  correctiveAction: z.string().nullable(),
  status: z.string(),
  reinspectionRequired: z.boolean(),
  reinspectionResult: z.string().nullable(),
  closedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  workPackage: z.object({ wpNumber: z.string() }).nullable().optional(),
});
export type Ncr = z.infer<typeof ncrSchema>;

export const createNcrSchema = z.object({
  projectId: z.string().optional(),
  workPackageId: z.string().optional(),
  category: z.enum(['MATERIAL', 'WORKMANSHIP', 'DESIGN', 'DOCUMENT', 'OTHER']).optional(),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).optional(),
  description: z.string().min(3).max(2000),
  reinspectionRequired: z.boolean().optional(),
});
export type CreateNcr = z.infer<typeof createNcrSchema>;

export const punchListItemSchema = z.object({
  id: z.string(),
  punchNumber: z.string(),
  projectId: z.string().nullable(),
  workPackageId: z.string().nullable(),
  handoverPackageId: z.string().nullable(),
  description: z.string(),
  status: z.string(),
  closedAt: z.string().nullable(),
  closedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  workPackage: z.object({ wpNumber: z.string() }).nullable().optional(),
});
export type PunchListItem = z.infer<typeof punchListItemSchema>;

export const createPunchItemSchema = z.object({
  projectId: z.string().optional(),
  workPackageId: z.string().optional(),
  handoverPackageId: z.string().optional(),
  description: z.string().min(3).max(1000),
});
export type CreatePunchItem = z.infer<typeof createPunchItemSchema>;
