
-- CreateTable
CREATE TABLE "PayrollAllocation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "period" TEXT NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "projectAmount" DECIMAL(18,2) NOT NULL,
    "overheadAmount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollAllocation_employeeId_idx" ON "PayrollAllocation"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollAllocation_projectId_idx" ON "PayrollAllocation"("projectId");

-- CreateIndex
CREATE INDEX "PayrollAllocation_period_idx" ON "PayrollAllocation"("period");

-- AddForeignKey
ALTER TABLE "PayrollAllocation" ADD CONSTRAINT "PayrollAllocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAllocation" ADD CONSTRAINT "PayrollAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

