import { z } from 'zod';
import { paginatedResponseSchema } from '../core';

export const collectionSchema = z.object({
  id: z.string(),
  collectionNumber: z.string(),
  projectId: z.string(),
  client: z.string(),
  bankAccount: z.string().nullable(),
  reference: z.string().nullable(),
  currency: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  collectedAt: z.string(),
  collectedBy: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(z.object({
    id: z.string(),
    clientInvoiceId: z.string(),
    amount: z.number(),
    clientInvoice: z.object({ invoiceNumber: z.string(), totalAmount: z.number() }).nullable().optional(),
  })),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
});
export type Collection = z.infer<typeof collectionSchema>;

export const createCollectionSchema = z.object({
  projectId: z.string(),
  client: z.string().min(2).max(200),
  bankAccount: z.string().max(100).optional(),
  reference: z.string().max(100).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(z.object({ clientInvoiceId: z.string(), amount: z.number().min(0.01) })).min(1),
});
export type CreateCollection = z.infer<typeof createCollectionSchema>;

export const collectionListResponseSchema = paginatedResponseSchema(collectionSchema);
export type CollectionListResponse = z.infer<typeof collectionListResponseSchema>;
