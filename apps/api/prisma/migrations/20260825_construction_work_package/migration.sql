-- CreateTable
CREATE TABLE "ConstructionWorkPackage" (
    "id" TEXT NOT NULL,
    "wpNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT,
    "plannedQty" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstructionWorkPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPackageProgress" (
    "id" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "progressDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "physicalProgress" DECIMAL(5,2) NOT NULL,
    "achievedQty" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "measuredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkPackageProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionWorkPackage_wpNumber_key" ON "ConstructionWorkPackage"("wpNumber");

-- CreateIndex
CREATE INDEX "ConstructionWorkPackage_projectId_idx" ON "ConstructionWorkPackage"("projectId");

-- CreateIndex
CREATE INDEX "ConstructionWorkPackage_wbsItemId_idx" ON "ConstructionWorkPackage"("wbsItemId");

-- CreateIndex
CREATE INDEX "ConstructionWorkPackage_status_idx" ON "ConstructionWorkPackage"("status");

-- CreateIndex
CREATE INDEX "WorkPackageProgress_workPackageId_idx" ON "WorkPackageProgress"("workPackageId");

-- AddForeignKey
ALTER TABLE "ConstructionWorkPackage" ADD CONSTRAINT "ConstructionWorkPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionWorkPackage" ADD CONSTRAINT "ConstructionWorkPackage_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WbsItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackageProgress" ADD CONSTRAINT "WorkPackageProgress_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "ConstructionWorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
