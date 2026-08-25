import { z } from 'zod';
import { paginatedResponseSchema } from './core';

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
  items: z.array(
    z.object({
      id: z.string(),
      poItemId: z.string().nullable(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitPrice: z.number(),
      totalPrice: z.number(),
      receivedQuantity: z.number().nullable(),
      matchStatus: z.string(),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  po: z.object({ poNumber: z.string() }).optional(),
});
export type VendorInvoice = z.infer<typeof vendorInvoiceSchema>;

export const createVendorInvoiceSchema = z.object({
  poId: z.string(),
  vendorInvoiceNo: z.string().min(1).max(100),
  invoiceDate: z.string().optional(),
  taxAmount: z.number().min(0).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      poItemId: z.string(),
      quantity: z.number().min(0.01),
      unitPrice: z.number().min(0),
    }),
  ).min(1),
});
export type CreateVendorInvoice = z.infer<typeof createVendorInvoiceSchema>;

export const paymentSchema = z.object({
  id: z.string(),
  paymentNumber: z.string(),
  projectId: z.string(),
  vendor: z.string(),
  bankAccount: z.string().nullable(),
  currency: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  paymentDate: z.string(),
  reference: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      invoiceId: z.string(),
      amount: z.number(),
      invoice: z.object({ invoiceNumber: z.string(), totalAmount: z.number() }).optional(),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentSchema = z.object({
  projectId: z.string(),
  vendor: z.string().min(2).max(200),
  bankAccount: z.string().max(100).optional(),
  reference: z.string().max(100).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      invoiceId: z.string(),
      amount: z.number().min(0.01),
    }),
  ).min(1),
});
export type CreatePayment = z.infer<typeof createPaymentSchema>;

export const chartOfAccountSchema = z.object({
  id: z.string(),
  legalEntityId: z.string(),
  code: z.string(),
  name: z.string(),
  accountType: z.string(),
  normalBalance: z.string(),
  parentId: z.string().nullable(),
  isActive: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  parent: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type ChartOfAccount = z.infer<typeof chartOfAccountSchema>;

export const createChartOfAccountSchema = z.object({
  legalEntityId: z.string(),
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  accountType: z.string().optional(),
  normalBalance: z.string().optional(),
  parentId: z.string().optional(),
  description: z.string().max(300).optional(),
});
export type CreateChartOfAccount = z.infer<typeof createChartOfAccountSchema>;

export const journalLineSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  description: z.string().nullable(),
  debit: z.number(),
  credit: z.number(),
  projectId: z.string().nullable(),
  wbsItemId: z.string().nullable(),
  account: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type JournalLine = z.infer<typeof journalLineSchema>;

export const journalSchema = z.object({
  id: z.string(),
  journalNumber: z.string(),
  legalEntityId: z.string(),
  date: z.string(),
  source: z.string(),
  sourceId: z.string().nullable(),
  reference: z.string().nullable(),
  description: z.string(),
  status: z.string(),
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  createdAt: z.string(),
  lines: z.array(journalLineSchema),
  legalEntity: z.object({ code: z.string() }).optional(),
});
export type Journal = z.infer<typeof journalSchema>;

export const journalListResponseSchema = paginatedResponseSchema(journalSchema);
export type JournalListResponse = z.infer<typeof journalListResponseSchema>;

export const createJournalLineSchema = z.object({
  accountId: z.string(),
  description: z.string().max(300).optional(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  projectId: z.string().optional(),
  wbsItemId: z.string().optional(),
});

export const createJournalSchema = z.object({
  legalEntityId: z.string(),
  date: z.string().optional(),
  description: z.string().min(1).max(500),
  reference: z.string().max(100).optional(),
  lines: z.array(createJournalLineSchema).min(1),
});
export type CreateJournal = z.infer<typeof createJournalSchema>;

export const trialBalanceSchema = z.object({
  legalEntityId: z.string(),
  legalEntityCode: z.string(),
  generatedAt: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  totalDebit: z.number(),
  totalCredit: z.number(),
  balanced: z.boolean(),
  lines: z.array(
    z.object({
      accountId: z.string(),
      code: z.string(),
      name: z.string(),
      accountType: z.string(),
      normalBalance: z.string(),
      debit: z.number(),
      credit: z.number(),
      balance: z.number(),
    }),
  ),
});
export type TrialBalance = z.infer<typeof trialBalanceSchema>;

export const progressClaimSchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  projectId: z.string(),
  claimDate: z.string(),
  period: z.string().nullable(),
  description: z.string().nullable(),
  amount: z.number(),
  claimType: z.string(),
  requestedExtensionDays: z.number().nullable().optional(),
  status: z.string(),
  certifiedAmount: z.number().nullable(),
  retentionRate: z.number().nullable().optional(),
  retentionAmount: z.number().nullable().optional(),
  netCertifiedAmount: z.number().nullable().optional(),
  recoveryAmount: z.number().nullable().optional(),
  cumulativeRecovered: z.number().nullable().optional(),
  certifiedBy: z.string().nullable(),
  certifiedAt: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  workPackageId: z.string().nullable().optional(),
  workPackage: z.object({ wpNumber: z.string(), title: z.string() }).nullable().optional(),
  physicalProgressAtClaim: z.number().nullable().optional(),
  billableProgress: z.number().nullable().optional(),
});
export type ProgressClaim = z.infer<typeof progressClaimSchema>;

export const createProgressClaimSchema = z.object({
  projectId: z.string(),
  claimDate: z.string().optional(),
  period: z.string().max(30).optional(),
  description: z.string().max(500).optional(),
  amount: z.number().min(0.01),
  claimType: z.enum(['PROGRESS', 'COST', 'TIME', 'EOT', 'CONTRACTUAL']).optional(),
  requestedExtensionDays: z.number().int().min(1).max(3650).optional(),
  workPackageId: z.string().optional(),
  physicalProgressAtClaim: z.number().min(0).max(100).optional(),
  billableProgress: z.number().min(0).max(100).optional(),
});
export type CreateProgressClaim = z.infer<typeof createProgressClaimSchema>;

export const certifyClaimSchema = z.object({
  certifiedAmount: z.number().min(0),
  retentionRate: z.number().min(0).max(100).optional(),
  remark: z.string().max(500).optional(),
});
export type CertifyClaim = z.infer<typeof certifyClaimSchema>;

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
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  claim: z.object({ claimNumber: z.string(), period: z.string().nullable() }).optional(),
});
export type ClientInvoice = z.infer<typeof clientInvoiceSchema>;

export const createClientInvoiceSchema = z.object({
  claimId: z.string(),
  invoiceDate: z.string().optional(),
  taxAmount: z.number().min(0).optional(),
  remark: z.string().max(500).optional(),
});
export type CreateClientInvoice = z.infer<typeof createClientInvoiceSchema>;

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
  items: z.array(
    z.object({
      id: z.string(),
      clientInvoiceId: z.string(),
      amount: z.number(),
      clientInvoice: z.object({ invoiceNumber: z.string(), totalAmount: z.number() }).optional(),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type Collection = z.infer<typeof collectionSchema>;

export const createCollectionSchema = z.object({
  projectId: z.string(),
  client: z.string().min(2).max(200),
  bankAccount: z.string().max(100).optional(),
  reference: z.string().max(100).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      clientInvoiceId: z.string(),
      amount: z.number().min(0.01),
    }),
  ).min(1),
});
export type CreateCollection = z.infer<typeof createCollectionSchema>;