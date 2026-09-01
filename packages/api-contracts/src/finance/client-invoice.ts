import { z } from 'zod';
import { paginatedResponseSchema } from '../core';

export const clientInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  projectId: z.string(),
  claimId: z.string(),
  client: z.string(),
  invoiceDate: z.string(),
  currency: z.string(),
  amount: z.number(),
  taxAmount: z.number().nullable(),
  totalAmount: z.number(),
  status: z.string(),
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  claim: z.object({ claimNumber: z.string(), period: z.string().nullable() }).nullable().optional(),
});
export type ClientInvoice = z.infer<typeof clientInvoiceSchema>;

export const createClientInvoiceSchema = z.object({
  claimId: z.string(),
  invoiceDate: z.string().optional(),
  taxAmount: z.number().min(0).optional(),
  remark: z.string().max(500).optional(),
});
export type CreateClientInvoice = z.infer<typeof createClientInvoiceSchema>;

export const clientInvoiceListResponseSchema = paginatedResponseSchema(clientInvoiceSchema);
export type ClientInvoiceListResponse = z.infer<typeof clientInvoiceListResponseSchema>;
