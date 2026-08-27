-- CreateTable
CREATE TABLE "ProjectVariation" (
    "id" TEXT NOT NULL,
    "variationNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ADDITIVE',
    "amountChange" DECIMAL(18,2) NOT NULL,
    "scheduleImpactDays" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'POTENTIAL',
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectVariation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVariation_variationNumber_key" ON "ProjectVariation"("variationNumber");

-- CreateIndex
CREATE INDEX "ProjectVariation_projectId_idx" ON "ProjectVariation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectVariation_status_idx" ON "ProjectVariation"("status");

-- AddForeignKey
ALTER TABLE "ProjectVariation" ADD CONSTRAINT "ProjectVariation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
