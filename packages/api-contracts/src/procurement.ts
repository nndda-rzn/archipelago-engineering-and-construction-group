import { z } from 'zod';

export const prItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  estimatedUnitPrice: z.number().nullable(),
  estimatedTotal: z.number().nullable(),
});

export const purchaseRequisitionSchema = z.object({
  id: z.string(),
  prNumber: z.string(),
  projectId: z.string(),
  wbsItemId: z.string().nullable(),
  requestedBy: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(prItemSchema),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type PurchaseRequisition = z.infer<typeof purchaseRequisitionSchema>;

export const createPrSchema = z.object({
  projectId: z.string(),
  wbsItemId: z.string().optional(),
  requestedBy: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  items: z.array(
    z.object({
      description: z.string().min(1).max(200),
      quantity: z.number().min(0.01),
      unit: z.string().optional(),
      estimatedUnitPrice: z.number().min(0).optional(),
    }),
  ).min(1),
});
export type CreatePr = z.infer<typeof createPrSchema>;

export const purchaseOrderSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  projectId: z.string(),
  requisitionId: z.string().nullable(),
  vendor: z.string(),
  currency: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  createdAt: z.string(),
  items: z.array(z.object({ id: z.string(), description: z.string(), quantity: z.number(), unit: z.string(), unitPrice: z.number(), totalPrice: z.number() })),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  requisition: z.object({ prNumber: z.string() }).optional(),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export const createPoSchema = z.object({
  requisitionId: z.string(),
  vendor: z.string().min(2).max(200),
  currency: z.string().length(3).optional(),
});
export type CreatePo = z.infer<typeof createPoSchema>;

export const rfqSchema = z.object({
  id: z.string(),
  rfqNumber: z.string(),
  projectId: z.string(),
  requisitionId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string().nullable(),
  status: z.string(),
  awardedVendor: z.string().nullable(),
  awardedQuoteId: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      wbsItemId: z.string().nullable(),
    }),
  ),
  quotes: z.array(
    z.object({
      id: z.string(),
      vendor: z.string(),
      totalAmount: z.number(),
      leadTimeDays: z.number().nullable(),
      isWinner: z.boolean(),
      status: z.string(),
      remark: z.string().nullable(),
      items: z.array(z.object({ id: z.string(), rfqItemId: z.string(), unitPrice: z.number(), totalPrice: z.number() })),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  requisition: z.object({ prNumber: z.string() }).optional(),
});
export type Rfq = z.infer<typeof rfqSchema>;

export const createRfqSchema = z.object({
  projectId: z.string(),
  requisitionId: z.string().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  dueDate: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1).max(200),
      quantity: z.number().min(0.01),
      unit: z.string().optional(),
      wbsItemId: z.string().optional(),
    }),
  ).min(1),
});
export type CreateRfq = z.infer<typeof createRfqSchema>;

export const createQuoteSchema = z.object({
  vendor: z.string().min(2).max(200),
  leadTimeDays: z.number().int().min(1).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      rfqItemId: z.string(),
      unitPrice: z.number().min(0),
    }),
  ).min(1),
});
export type CreateQuote = z.infer<typeof createQuoteSchema>;