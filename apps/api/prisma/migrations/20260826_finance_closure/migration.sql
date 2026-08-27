
-- CreateTable
CREATE TABLE "IntercompanyTransaction" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntercompanyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodClose" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "steps" JSONB,
    "journalCount" INTEGER NOT NULL DEFAULT 0,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntercompanyTransaction_transactionNumber_key" ON "IntercompanyTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "IntercompanyTransaction_fromEntityId_idx" ON "IntercompanyTransaction"("fromEntityId");

-- CreateIndex
CREATE INDEX "IntercompanyTransaction_toEntityId_idx" ON "IntercompanyTransaction"("toEntityId");

-- CreateIndex
CREATE INDEX "IntercompanyTransaction_status_idx" ON "IntercompanyTransaction"("status");

-- CreateIndex
CREATE INDEX "PeriodClose_legalEntityId_idx" ON "PeriodClose"("legalEntityId");

-- CreateIndex
CREATE INDEX "PeriodClose_status_idx" ON "PeriodClose"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodClose_legalEntityId_period_key" ON "PeriodClose"("legalEntityId", "period");

-- AddForeignKey
ALTER TABLE "IntercompanyTransaction" ADD CONSTRAINT "IntercompanyTransaction_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntercompanyTransaction" ADD CONSTRAINT "IntercompanyTransaction_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodClose" ADD CONSTRAINT "PeriodClose_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

