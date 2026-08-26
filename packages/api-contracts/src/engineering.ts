import { z } from 'zod';

export const deliverableSchema = z.object({
  id: z.string(),
  deliverableNumber: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  discipline: z.string(),
  engineer: z.string(),
  plannedDate: z.string().nullable(),
  forecastDate: z.string().nullable(),
  actualDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string() }).optional(),
});
export type Deliverable = z.infer<typeof deliverableSchema>;

export const createDeliverableSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(3).max(200),
  discipline: z.string().optional(),
  engineer: z.string().min(2).max(200),
  plannedDate: z.string().optional(),
  forecastDate: z.string().optional(),
});
export type CreateDeliverable = z.infer<typeof createDeliverableSchema>;

export const drawingRevisionSchema = z.object({
  id: z.string(),
  drawingId: z.string(),
  revision: z.string(),
  description: z.string().nullable(),
  publishedAt: z.string(),
  publishedBy: z.string(),
});
export type DrawingRevision = z.infer<typeof drawingRevisionSchema>;

export const drawingSchema = z.object({
  id: z.string(),
  drawingNumber: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  discipline: z.string(),
  currentRevision: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string() }).optional(),
  revisions: z.array(drawingRevisionSchema).optional(),
});
export type Drawing = z.infer<typeof drawingSchema>;

export const createDrawingSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(3).max(200),
  discipline: z.string().optional(),
});
export type CreateDrawing = z.infer<typeof createDrawingSchema>;

export const rfiSchema = z.object({
  id: z.string(),
  rfiNumber: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  question: z.string(),
  answer: z.string().nullable(),
  impactCost: z.number().nullable(),
  impactScheduleDays: z.number().nullable(),
  status: z.string(),
  createdBy: z.string(),
  answeredBy: z.string().nullable(),
  answeredAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string() }).optional(),
});
export type Rfi = z.infer<typeof rfiSchema>;

export const createRfiSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(3).max(200),
  question: z.string().min(5).max(2000),
});
export type CreateRfi = z.infer<typeof createRfiSchema>;

export const submittalSchema = z.object({
  id: z.string(),
  submittalNumber: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  dueDate: z.string().nullable(),
  status: z.string(),
  responseNote: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string() }).optional(),
});
export type Submittal = z.infer<typeof submittalSchema>;

export const createSubmittalSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(3).max(200),
  dueDate: z.string().optional(),
});
export type CreateSubmittal = z.infer<typeof createSubmittalSchema>;

export const transmittalSchema = z.object({
  id: z.string(),
  transmittalNumber: z.string(),
  projectId: z.string().nullable(),
  recipient: z.string(),
  subject: z.string(),
  documentList: z.string().nullable(),
  sentAt: z.string(),
  sentBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string() }).optional(),
});
export type Transmittal = z.infer<typeof transmittalSchema>;

export const createTransmittalSchema = z.object({
  projectId: z.string().optional(),
  recipient: z.string().min(2).max(200),
  subject: z.string().min(3).max(200),
  documentList: z.string().max(2000).optional(),
});
export type CreateTransmittal = z.infer<typeof createTransmittalSchema>;
