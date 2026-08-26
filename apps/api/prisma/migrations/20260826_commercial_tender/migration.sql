
-- CreateTable
CREATE TABLE "BidDecision" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "rationale" TEXT,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BidDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'WORKING',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingScenario" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "scenarioType" TEXT NOT NULL DEFAULT 'BASE',
    "amount" DECIMAL(18,2) NOT NULL,
    "marginPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDeviation" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "clause" TEXT NOT NULL,
    "clientRequirement" TEXT NOT NULL,
    "aecPosition" TEXT NOT NULL,
    "risk" TEXT NOT NULL DEFAULT 'LOW',
    "owner" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDeviation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderSubmission" (
    "id" TEXT NOT NULL,
    "submissionNumber" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "estimateId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'ELECTRONIC',
    "packageVersion" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL,
    "acknowledgement" TEXT,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenderSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAmendment" (
    "id" TEXT NOT NULL,
    "amendmentNumber" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountChange" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "signedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BidDecision_decision_idx" ON "BidDecision"("decision");

-- CreateIndex
CREATE UNIQUE INDEX "BidDecision_opportunityId_key" ON "BidDecision"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_estimateNumber_key" ON "Estimate"("estimateNumber");

-- CreateIndex
CREATE INDEX "Estimate_opportunityId_idx" ON "Estimate"("opportunityId");

-- CreateIndex
CREATE INDEX "Estimate_status_idx" ON "Estimate"("status");

-- CreateIndex
CREATE INDEX "PricingScenario_estimateId_idx" ON "PricingScenario"("estimateId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingScenario_estimateId_scenarioType_key" ON "PricingScenario"("estimateId", "scenarioType");

-- CreateIndex
CREATE INDEX "ContractDeviation_opportunityId_idx" ON "ContractDeviation"("opportunityId");

-- CreateIndex
CREATE INDEX "ContractDeviation_status_idx" ON "ContractDeviation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TenderSubmission_submissionNumber_key" ON "TenderSubmission"("submissionNumber");

-- CreateIndex
CREATE INDEX "TenderSubmission_opportunityId_idx" ON "TenderSubmission"("opportunityId");

-- CreateIndex
CREATE INDEX "TenderSubmission_status_idx" ON "TenderSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractAmendment_amendmentNumber_key" ON "ContractAmendment"("amendmentNumber");

-- CreateIndex
CREATE INDEX "ContractAmendment_contractId_idx" ON "ContractAmendment"("contractId");

-- CreateIndex
CREATE INDEX "ContractAmendment_status_idx" ON "ContractAmendment"("status");

-- AddForeignKey
ALTER TABLE "BidDecision" ADD CONSTRAINT "BidDecision_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingScenario" ADD CONSTRAINT "PricingScenario_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDeviation" ADD CONSTRAINT "ContractDeviation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderSubmission" ADD CONSTRAINT "TenderSubmission_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderSubmission" ADD CONSTRAINT "TenderSubmission_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAmendment" ADD CONSTRAINT "ContractAmendment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

