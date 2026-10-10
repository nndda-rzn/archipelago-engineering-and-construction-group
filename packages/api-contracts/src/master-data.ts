import { z } from 'zod';

export const vendorCategorySchema = z.enum(['MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER']);
export type VendorCategory = z.infer<typeof vendorCategorySchema>;

export const vendorStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type VendorStatus = z.infer<typeof vendorStatusSchema>;

export const fiscalPeriodStatusSchema = z.enum(['FUTURE', 'OPEN', 'SOFT_CLOSED', 'CLOSED', 'LOCKED']);
export type FiscalPeriodStatus = z.infer<typeof fiscalPeriodStatusSchema>;

export const vendorSchema = z.object({
  id: z.string(),
  vendorCode: z.string(),
  name: z.string(),
  taxId: z.string().nullable(),
  category: z.string(),
  contactPerson: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Vendor = z.infer<typeof vendorSchema>;

export const createVendorSchema = z.object({
  name: z.string().min(2).max(200),
  taxId: z.string().max(30).optional(),
  category: vendorCategorySchema.optional(),
  contactPerson: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});
export type CreateVendor = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = createVendorSchema.partial();
export type UpdateVendor = z.infer<typeof updateVendorSchema>;

export const vendorStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
  avgScore: z.number().nullable(),
  ratingCount: z.number(),
  byCategory: z.array(z.object({ category: z.string(), count: z.number() })),
});
export type VendorStats = z.infer<typeof vendorStatsSchema>;

export const vendorRatingEntrySchema = z.object({
  id: z.string(),
  category: z.string(),
  score: z.number(),
  remark: z.string().nullable(),
  ratedBy: z.string(),
  ratingDate: z.string(),
});
export type VendorRatingEntry = z.infer<typeof vendorRatingEntrySchema>;

export const vendorDetailSchema = z.object({
  vendor: vendorSchema,
  performance: z.object({
    overall: z.number().nullable(),
    count: z.number(),
    byCategory: z.record(z.string(), z.object({ count: z.number(), avg: z.number() })),
  }),
  spend: z.object({
    postedInvoiceValue: z.number(),
    invoiceCount: z.number(),
    poCount: z.number(),
  }),
  ratings: z.array(vendorRatingEntrySchema).optional(),
});
export type VendorDetail = z.infer<typeof vendorDetailSchema>;

export const fiscalPeriodSchema = z.object({
  id: z.string(),
  periodCode: z.string(),
  periodYear: z.number(),
  periodMonth: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FiscalPeriod = z.infer<typeof fiscalPeriodSchema>;

export const createFiscalPeriodSchema = z.object({
  periodCode: z.string().length(7),
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  startDate: z.string(),
  endDate: z.string(),
});
export type CreateFiscalPeriod = z.infer<typeof createFiscalPeriodSchema>;

export const numberSequenceSchema = z.object({
  id: z.string(),
  code: z.string(),
  prefix: z.string(),
  nextNumber: z.number(),
  padding: z.number(),
  status: z.string(),
});
export type NumberSequence = z.infer<typeof numberSequenceSchema>;
