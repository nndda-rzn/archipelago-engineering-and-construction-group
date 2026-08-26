
-- AlterTable
ALTER TABLE "ConstructionWorkPackage" ADD COLUMN     "readyNote" TEXT,
ADD COLUMN     "readyStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "requiresIFC" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Drawing" ADD COLUMN     "isIFC" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DoaRule" (
    "id" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "businessUnit" TEXT,
    "projectId" TEXT,
    "currencyCode" TEXT,
    "amountFrom" DECIMAL(18,2),
    "amountTo" DECIMAL(18,2),
    "riskLevel" TEXT,
    "approverLevel" TEXT NOT NULL,
    "approverRoleCode" TEXT,
    "approvalMode" TEXT NOT NULL DEFAULT 'SEQUENTIAL',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoaRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT '',
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCurrencyId" TEXT NOT NULL,
    "toCurrencyId" TEXT NOT NULL,
    "rateType" TEXT NOT NULL DEFAULT 'SPOT',
    "rate" DECIMAL(18,6) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoaRule_transactionType_idx" ON "DoaRule"("transactionType");

-- CreateIndex
CREATE INDEX "DoaRule_status_idx" ON "DoaRule"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrencyId_idx" ON "ExchangeRate"("fromCurrencyId");

-- CreateIndex
CREATE INDEX "ExchangeRate_toCurrencyId_idx" ON "ExchangeRate"("toCurrencyId");

-- CreateIndex
CREATE INDEX "ExchangeRate_effectiveDate_idx" ON "ExchangeRate"("effectiveDate");

-- AddForeignKey
ALTER TABLE "DoaRule" ADD CONSTRAINT "DoaRule_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoaRule" ADD CONSTRAINT "DoaRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrencyId_fkey" FOREIGN KEY ("toCurrencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

