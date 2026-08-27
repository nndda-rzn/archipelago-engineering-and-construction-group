import { z } from 'zod';
import { paginatedResponseSchema } from './core';

// ─── Treasury (Fase 11A, FR-TRY-001..005) ────────────────────────────────────

export const bankAccountSchema = z.object({
  id: z.string(),
  accountCode: z.string(),
  legalEntityId: z.string(),
  bankCode: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  currency: z.string(),
  openingBalance: z.number(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  legalEntity: z.object({ code: z.string(), legalName: z.string() }),
});
export type BankAccount = z.infer<typeof bankAccountSchema>;

export const bankAccountListResponseSchema = paginatedResponseSchema(bankAccountSchema);
export type BankAccountListResponse = z.infer<typeof bankAccountListResponseSchema>;

export const createBankAccountSchema = z.object({
  legalEntityId: z.string(),
  bankCode: z.string().min(1).max(30),
  bankName: z.string().min(1).max(100),
  accountNumber: z.string().min(1).max(50),
  accountName: z.string().min(1).max(200),
  currency: z.string().length(3).optional(),
  openingBalance: z.number().optional(),
});
export type CreateBankAccount = z.infer<typeof createBankAccountSchema>;

export const cashPositionSchema = z.object({
  items: z.array(
    z.object({
      bankAccountId: z.string(),
      accountCode: z.string(),
      bankName: z.string(),
      accountNumber: z.string(),
      currency: z.string(),
      legalEntityCode: z.string(),
      openingBalance: z.number(),
      outflow: z.number(),
      currentBalance: z.number(),
    }),
  ),
  totalBalance: z.number(),
  generatedAt: z.string(),
});
export type CashPosition = z.infer<typeof cashPositionSchema>;

export const paymentProposalSchema = z.object({
  id: z.string(),
  proposalNumber: z.string(),
  legalEntityId: z.string(),
  bankAccountId: z.string().nullable(),
  vendor: z.string(),
  currency: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  invoiceIds: z.unknown().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  legalEntity: z.object({ code: z.string() }),
  bankAccount: z.object({ accountCode: z.string(), bankName: z.string() }).nullable(),
});
export type PaymentProposal = z.infer<typeof paymentProposalSchema>;

export const paymentProposalListResponseSchema = paginatedResponseSchema(paymentProposalSchema);
export type PaymentProposalListResponse = z.infer<typeof paymentProposalListResponseSchema>;

export const createPaymentProposalSchema = z.object({
  legalEntityId: z.string(),
  vendor: z.string().min(1),
  totalAmount: z.number().min(0),
  bankAccountId: z.string().optional(),
  currency: z.string().length(3).optional(),
  invoiceIds: z.array(z.string()).optional(),
  remark: z.string().max(500).optional(),
});
export type CreatePaymentProposal = z.infer<typeof createPaymentProposalSchema>;

export const bankGuaranteeSchema = z.object({
  id: z.string(),
  guaranteeNumber: z.string(),
  legalEntityId: z.string(),
  projectId: z.string().nullable(),
  guaranteeType: z.string(),
  beneficiary: z.string(),
  bankName: z.string(),
  amount: z.number(),
  currency: z.string(),
  issueDate: z.string(),
  expiryDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  legalEntity: z.object({ code: z.string() }),
  project: z.object({ code: z.string() }).nullable(),
});
export type BankGuarantee = z.infer<typeof bankGuaranteeSchema>;

export const bankGuaranteeListResponseSchema = paginatedResponseSchema(bankGuaranteeSchema);
export type BankGuaranteeListResponse = z.infer<typeof bankGuaranteeListResponseSchema>;

export const createBankGuaranteeSchema = z.object({
  legalEntityId: z.string(),
  projectId: z.string().optional(),
  guaranteeType: z.enum(['BID', 'PERFORMANCE', 'ADVANCE', 'RETENTION', 'MAINTENANCE']).optional(),
  beneficiary: z.string().min(1).max(200),
  bankName: z.string().min(1).max(100),
  amount: z.number().min(0),
  currency: z.string().length(3).optional(),
  expiryDate: z.string().optional(),
});
export type CreateBankGuarantee = z.infer<typeof createBankGuaranteeSchema>;

export const cashForecastSchema = z.object({
  id: z.string(),
  forecastCode: z.string(),
  legalEntityId: z.string(),
  period: z.string(),
  expectedReceipt: z.number(),
  expectedAp: z.number(),
  expectedPayroll: z.number(),
  expectedLoan: z.number(),
  expectedTax: z.number(),
  projectCashFlow: z.number(),
  netForecast: z.number(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  legalEntity: z.object({ code: z.string() }),
});
export type CashForecast = z.infer<typeof cashForecastSchema>;

export const createCashForecastSchema = z.object({
  legalEntityId: z.string(),
  period: z.string().min(1),
  expectedReceipt: z.number().optional(),
  expectedAp: z.number().optional(),
  expectedPayroll: z.number().optional(),
  expectedLoan: z.number().optional(),
  expectedTax: z.number().optional(),
  projectCashFlow: z.number().optional(),
});
export type CreateCashForecast = z.infer<typeof createCashForecastSchema>;

export const fxExposureSchema = z.object({
  id: z.string(),
  legalEntityId: z.string(),
  currency: z.string(),
  exposureAmount: z.number(),
  rate: z.number(),
  baseCurrency: z.string(),
  asOfDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  legalEntity: z.object({ code: z.string() }),
});
export type FxExposure = z.infer<typeof fxExposureSchema>;

export const createFxExposureSchema = z.object({
  legalEntityId: z.string(),
  currency: z.string().length(3),
  exposureAmount: z.number(),
  rate: z.number().optional(),
  baseCurrency: z.string().length(3).optional(),
});
export type CreateFxExposure = z.infer<typeof createFxExposureSchema>;
