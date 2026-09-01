import { z } from 'zod';
import { paginatedResponseSchema } from '../core';

export const paymentSchema = z.object({
  id: z.string(),
  paymentNumber: z.string(),
  projectId: z.string(),
  vendor: z.string(),
  bankAccount: z.string().nullable(),
  reference: z.string().nullable(),
  currency: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  paymentDate: z.string(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(z.object({
    id: z.string(),
    invoiceId: z.string(),
    amount: z.number(),
    invoice: z.object({ invoiceNumber: z.string(), totalAmount: z.number() }).nullable().optional(),
  })),
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentSchema = z.object({
  projectId: z.string(),
  vendor: z.string().min(2).max(200),
  bankAccount: z.string().max(100).optional(),
  reference: z.string().max(100).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(z.object({ invoiceId: z.string(), amount: z.number().min(0.01) })).min(1),
});
export type CreatePayment = z.infer<typeof createPaymentSchema>;

export const paymentListResponseSchema = paginatedResponseSchema(paymentSchema);
export type PaymentListResponse = z.infer<typeof paymentListResponseSchema>;
