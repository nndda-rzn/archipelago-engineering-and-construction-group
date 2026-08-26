
-- CreateTable
CREATE TABLE "Itp" (
    "id" TEXT NOT NULL,
    "itpNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "workPackageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Itp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionRequest" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "workPackageId" TEXT,
    "itpId" TEXT,
    "description" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "inspectedAt" TIMESTAMP(3),
    "inspectedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ncr" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "workPackageId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'WORKMANSHIP',
    "severity" TEXT NOT NULL DEFAULT 'MINOR',
    "description" TEXT NOT NULL,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reinspectionRequired" BOOLEAN NOT NULL DEFAULT true,
    "reinspectionResult" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ncr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PunchListItem" (
    "id" TEXT NOT NULL,
    "punchNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "workPackageId" TEXT,
    "handoverPackageId" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PunchListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Itp_itpNumber_key" ON "Itp"("itpNumber");

-- CreateIndex
CREATE INDEX "Itp_projectId_idx" ON "Itp"("projectId");

-- CreateIndex
CREATE INDEX "Itp_status_idx" ON "Itp"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionRequest_inspectionNumber_key" ON "InspectionRequest"("inspectionNumber");

-- CreateIndex
CREATE INDEX "InspectionRequest_projectId_idx" ON "InspectionRequest"("projectId");

-- CreateIndex
CREATE INDEX "InspectionRequest_status_idx" ON "InspectionRequest"("status");

-- CreateIndex
CREATE INDEX "InspectionRequest_result_idx" ON "InspectionRequest"("result");

-- CreateIndex
CREATE UNIQUE INDEX "Ncr_ncrNumber_key" ON "Ncr"("ncrNumber");

-- CreateIndex
CREATE INDEX "Ncr_projectId_idx" ON "Ncr"("projectId");

-- CreateIndex
CREATE INDEX "Ncr_severity_idx" ON "Ncr"("severity");

-- CreateIndex
CREATE INDEX "Ncr_status_idx" ON "Ncr"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PunchListItem_punchNumber_key" ON "PunchListItem"("punchNumber");

-- CreateIndex
CREATE INDEX "PunchListItem_projectId_idx" ON "PunchListItem"("projectId");

-- CreateIndex
CREATE INDEX "PunchListItem_status_idx" ON "PunchListItem"("status");

-- AddForeignKey
ALTER TABLE "Itp" ADD CONSTRAINT "Itp_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Itp" ADD CONSTRAINT "Itp_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "ConstructionWorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRequest" ADD CONSTRAINT "InspectionRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRequest" ADD CONSTRAINT "InspectionRequest_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "ConstructionWorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRequest" ADD CONSTRAINT "InspectionRequest_itpId_fkey" FOREIGN KEY ("itpId") REFERENCES "Itp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ncr" ADD CONSTRAINT "Ncr_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ncr" ADD CONSTRAINT "Ncr_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "ConstructionWorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchListItem" ADD CONSTRAINT "PunchListItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchListItem" ADD CONSTRAINT "PunchListItem_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "ConstructionWorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchListItem" ADD CONSTRAINT "PunchListItem_handoverPackageId_fkey" FOREIGN KEY ("handoverPackageId") REFERENCES "HandoverPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

