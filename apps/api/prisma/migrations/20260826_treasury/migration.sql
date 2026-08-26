
-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashPosition" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProposal" (
    "id" TEXT NOT NULL,
    "proposalNumber" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "vendor" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "invoiceIds" JSONB,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankGuarantee" (
    "id" TEXT NOT NULL,
    "guaranteeNumber" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "projectId" TEXT,
    "guaranteeType" TEXT NOT NULL DEFAULT 'BID',
    "beneficiary" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankGuarantee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashForecast" (
    "id" TEXT NOT NULL,
    "forecastCode" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "expectedReceipt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "expectedAp" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "expectedPayroll" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "expectedLoan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "expectedTax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "projectCashFlow" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netForecast" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxExposure" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "exposureAmount" DECIMAL(18,2) NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "baseCurrency" TEXT NOT NULL DEFAULT 'IDR',
    "asOfDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FxExposure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_accountCode_key" ON "BankAccount"("accountCode");

-- CreateIndex
CREATE INDEX "BankAccount_legalEntityId_idx" ON "BankAccount"("legalEntityId");

-- CreateIndex
CREATE INDEX "BankAccount_currency_idx" ON "BankAccount"("currency");

-- CreateIndex
CREATE INDEX "BankAccount_status_idx" ON "BankAccount"("status");

-- CreateIndex
CREATE INDEX "CashPosition_bankAccountId_idx" ON "CashPosition"("bankAccountId");

-- CreateIndex
CREATE INDEX "CashPosition_legalEntityId_idx" ON "CashPosition"("legalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProposal_proposalNumber_key" ON "PaymentProposal"("proposalNumber");

-- CreateIndex
CREATE INDEX "PaymentProposal_legalEntityId_idx" ON "PaymentProposal"("legalEntityId");

-- CreateIndex
CREATE INDEX "PaymentProposal_bankAccountId_idx" ON "PaymentProposal"("bankAccountId");

-- CreateIndex
CREATE INDEX "PaymentProposal_status_idx" ON "PaymentProposal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BankGuarantee_guaranteeNumber_key" ON "BankGuarantee"("guaranteeNumber");

-- CreateIndex
CREATE INDEX "BankGuarantee_legalEntityId_idx" ON "BankGuarantee"("legalEntityId");

-- CreateIndex
CREATE INDEX "BankGuarantee_projectId_idx" ON "BankGuarantee"("projectId");

-- CreateIndex
CREATE INDEX "BankGuarantee_status_idx" ON "BankGuarantee"("status");

-- CreateIndex
CREATE INDEX "BankGuarantee_expiryDate_idx" ON "BankGuarantee"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "CashForecast_forecastCode_key" ON "CashForecast"("forecastCode");

-- CreateIndex
CREATE INDEX "CashForecast_legalEntityId_idx" ON "CashForecast"("legalEntityId");

-- CreateIndex
CREATE INDEX "CashForecast_period_idx" ON "CashForecast"("period");

-- CreateIndex
CREATE INDEX "FxExposure_legalEntityId_idx" ON "FxExposure"("legalEntityId");

-- CreateIndex
CREATE INDEX "FxExposure_currency_idx" ON "FxExposure"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "FxExposure_legalEntityId_currency_key" ON "FxExposure"("legalEntityId", "currency");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPosition" ADD CONSTRAINT "CashPosition_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPosition" ADD CONSTRAINT "CashPosition_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProposal" ADD CONSTRAINT "PaymentProposal_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProposal" ADD CONSTRAINT "PaymentProposal_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankGuarantee" ADD CONSTRAINT "BankGuarantee_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankGuarantee" ADD CONSTRAINT "BankGuarantee_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashForecast" ADD CONSTRAINT "CashForecast_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FxExposure" ADD CONSTRAINT "FxExposure_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

