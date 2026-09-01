import { z } from 'zod';
import { paginatedResponseSchema } from '../core';

export const vendorInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  poId: z.string(),
  projectId: z.string(),
  vendor: z.string(),
  vendorInvoiceNo: z.string(),
  invoiceDate: z.string(),
  currency: z.string(),
  amount: z.number(),
  taxAmount: z.number().nullable(),
  totalAmount: z.number(),
  status: z.string(),
  matchedAt: z.string().nullable(),
  postedAt: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(z.object({
    id: z.string(),
    poItemId: z.string().nullable(),
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    receivedQuantity: z.number().nullable(),
    matchStatus: z.string(),
  })),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  po: z.object({ poNumber: z.string() }).nullable().optional(),
});
export type VendorInvoice = z.infer<typeof vendorInvoiceSchema>;

export const createVendorInvoiceSchema = z.object({
  poId: z.string(),
  vendorInvoiceNo: z.string().min(1).max(100),
  invoiceDate: z.string().optional(),
  taxAmount: z.number().min(0).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(z.object({ poItemId: z.string(), quantity: z.number().min(0.01), unitPrice: z.number().min(0) })).min(1),
});
export type CreateVendorInvoice = z.infer<typeof createVendorInvoiceSchema>;

export const vendorInvoiceListResponseSchema = paginatedResponseSchema(vendorInvoiceSchema);
export type VendorInvoiceListResponse = z.infer<typeof vendorInvoiceListResponseSchema>;
