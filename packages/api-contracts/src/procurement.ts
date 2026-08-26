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
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
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
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  requisition: z.object({ prNumber: z.string() }).nullable().optional(),
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
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  requisition: z.object({ prNumber: z.string() }).nullable().optional(),
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

// ─── Procurement Hardening (Fase 11E, FR-PRO-002/005/006/008/010) ─────────────

export const budgetStatusSchema = z.object({
  projectId: z.string(),
  budget: z.number(),
  commitment: z.number(),
  existingPr: z.number(),
  remaining: z.number(),
  within: z.boolean(),
  generatedAt: z.string(),
});
export type BudgetStatus = z.infer<typeof budgetStatusSchema>;

export const technicalReviewSchema = z.object({
  technicalStatus: z.enum(['PASS', 'REJECT']),
  technicalNote: z.string().max(1000).optional(),
});
export type TechnicalReview = z.infer<typeof technicalReviewSchema>;

export const commercialEvaluationSchema = z.object({
  rfqId: z.string(),
  rfqNumber: z.string(),
  items: z.array(
    z.object({
      quoteId: z.string(),
      vendor: z.string(),
      totalAmount: z.number(),
      leadTimeDays: z.number(),
      normalizedScore: z.number(),
      technicalStatus: z.string(),
      isWinner: z.boolean(),
    }),
  ),
  recommended: z.object({
    quoteId: z.string(),
    vendor: z.string(),
    totalAmount: z.number(),
    leadTimeDays: z.number(),
    normalizedScore: z.number(),
    technicalStatus: z.string(),
    isWinner: z.boolean(),
  }).nullable(),
  generatedAt: z.string(),
});
export type CommercialEvaluation = z.infer<typeof commercialEvaluationSchema>;

export const poChangeSchema = z.object({
  id: z.string(),
  changeNumber: z.string(),
  purchaseOrderId: z.string(),
  version: z.number(),
  previousTotal: z.number(),
  newTotal: z.number(),
  reason: z.string(),
  status: z.string(),
  createdBy: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
});
export type PoChange = z.infer<typeof poChangeSchema>;

export const createPoChangeSchema = z.object({
  newTotal: z.number().min(0),
  reason: z.string().min(1).max(1000),
});
export type CreatePoChange = z.infer<typeof createPoChangeSchema>;

export const vendorRatingSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  projectId: z.string().nullable(),
  category: z.string(),
  score: z.number(),
  remark: z.string().nullable(),
  ratedBy: z.string(),
  ratingDate: z.string(),
  vendor: z.object({ vendorCode: z.string(), name: z.string() }),
  project: z.object({ code: z.string() }).nullable(),
});
export type VendorRating = z.infer<typeof vendorRatingSchema>;

export const createVendorRatingSchema = z.object({
  vendorId: z.string(),
  projectId: z.string().optional(),
  category: z.enum(['DELIVERY', 'QUALITY', 'COMMERCIAL', 'HSE', 'RESPONSIVENESS']),
  score: z.number().int().min(1).max(5),
  remark: z.string().max(1000).optional(),
});
export type CreateVendorRating = z.infer<typeof createVendorRatingSchema>;

export const vendorPerformanceSchema = z.object({
  items: z.array(
    z.object({
      vendorCode: z.string(),
      vendorName: z.string(),
      DELIVERY: z.number(),
      QUALITY: z.number(),
      COMMERCIAL: z.number(),
      HSE: z.number(),
      RESPONSIVENESS: z.number(),
      overall: z.number(),
    }),
  ),
  total: z.number(),
  generatedAt: z.string(),
});
export type VendorPerformance = z.infer<typeof vendorPerformanceSchema>;