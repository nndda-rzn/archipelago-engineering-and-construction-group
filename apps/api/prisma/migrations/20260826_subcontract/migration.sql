-- CreateTable
CREATE TABLE "Subcontract" (
    "id" TEXT NOT NULL,
    "subconNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contractValue" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcontract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractProgress" (
    "id" TEXT NOT NULL,
    "subcontractId" TEXT NOT NULL,
    "period" TEXT,
    "progressDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progressPercent" DECIMAL(5,2) NOT NULL,
    "verifiedAmount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcontractProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subcontract_subconNumber_key" ON "Subcontract"("subconNumber");

-- CreateIndex
CREATE INDEX "Subcontract_projectId_idx" ON "Subcontract"("projectId");

-- CreateIndex
CREATE INDEX "Subcontract_status_idx" ON "Subcontract"("status");

-- CreateIndex
CREATE INDEX "SubcontractProgress_subcontractId_idx" ON "SubcontractProgress"("subcontractId");

-- CreateIndex
CREATE INDEX "SubcontractProgress_status_idx" ON "SubcontractProgress"("status");

-- AddForeignKey
ALTER TABLE "Subcontract" ADD CONSTRAINT "Subcontract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractProgress" ADD CONSTRAINT "SubcontractProgress_subcontractId_fkey" FOREIGN KEY ("subcontractId") REFERENCES "Subcontract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
