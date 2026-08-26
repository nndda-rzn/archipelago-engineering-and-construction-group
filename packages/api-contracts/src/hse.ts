import { z } from 'zod';

export const safetyObservationSchema = z.object({
  id: z.string(),
  observationNumber: z.string(),
  projectId: z.string().nullable(),
  observationDate: z.string(),
  type: z.string(),
  description: z.string(),
  observedBy: z.string(),
  status: z.string(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
});
export type SafetyObservation = z.infer<typeof safetyObservationSchema>;

export const createObservationSchema = z.object({
  projectId: z.string().optional(),
  observationDate: z.string().optional(),
  type: z.enum(['SAFE', 'UNSAFE']).optional(),
  description: z.string().min(3).max(1000),
});
export type CreateObservation = z.infer<typeof createObservationSchema>;

export const correctiveActionSchema = z.object({
  id: z.string(),
  sourceType: z.string(),
  sourceId: z.string(),
  action: z.string(),
  owner: z.string(),
  dueDate: z.string(),
  evidence: z.string().nullable(),
  status: z.string(),
  verifiedBy: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CorrectiveAction = z.infer<typeof correctiveActionSchema>;

export const createCorrectiveActionSchema = z.object({
  sourceType: z.enum(['OBSERVATION', 'INCIDENT']),
  sourceId: z.string(),
  action: z.string().min(3).max(1000),
  owner: z.string().min(2).max(200),
  dueDate: z.string(),
});
export type CreateCorrectiveAction = z.infer<typeof createCorrectiveActionSchema>;

export const hseIncidentSchema = z.object({
  id: z.string(),
  incidentNumber: z.string(),
  projectId: z.string().nullable(),
  incidentDate: z.string(),
  type: z.string(),
  severity: z.string(),
  description: z.string(),
  rootCause: z.string().nullable(),
  status: z.string(),
  resolvedAt: z.string().nullable(),
  reportedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  correctiveActions: z.array(correctiveActionSchema).optional(),
});
export type HseIncident = z.infer<typeof hseIncidentSchema>;

export const createIncidentSchema = z.object({
  projectId: z.string().optional(),
  incidentDate: z.string().optional(),
  type: z.enum(['INJURY', 'NEAR_MISS', 'PROPERTY', 'ENVIRONMENT', 'OTHER']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  description: z.string().min(3).max(2000),
});
export type CreateIncident = z.infer<typeof createIncidentSchema>;

export const permitToWorkSchema = z.object({
  id: z.string(),
  permitNumber: z.string(),
  projectId: z.string().nullable(),
  area: z.string(),
  description: z.string().nullable(),
  validFrom: z.string(),
  validTo: z.string(),
  status: z.string(),
  issuedTo: z.string(),
  revokedAt: z.string().nullable(),
  revokedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
});
export type PermitToWork = z.infer<typeof permitToWorkSchema>;

export const createPermitSchema = z.object({
  projectId: z.string().optional(),
  area: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  validFrom: z.string(),
  validTo: z.string(),
  issuedTo: z.string().min(2).max(200),
});
export type CreatePermit = z.infer<typeof createPermitSchema>;
