import { z } from 'zod';

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
  category: z.enum(['MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER']).optional(),
  contactPerson: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});
export type CreateVendor = z.infer<typeof createVendorSchema>;

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
