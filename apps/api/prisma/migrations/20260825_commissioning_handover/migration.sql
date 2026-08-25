-- CreateTable
CREATE TABLE "CommissioningSystem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissioningSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverPackage" (
    "id" TEXT NOT NULL,
    "hoNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "handoverDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "checklist" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandoverPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverItem" (
    "id" TEXT NOT NULL,
    "handoverId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "HandoverItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissioningSystem_projectId_idx" ON "CommissioningSystem"("projectId");

-- CreateIndex
CREATE INDEX "CommissioningSystem_parentId_idx" ON "CommissioningSystem"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissioningSystem_projectId_code_key" ON "CommissioningSystem"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "HandoverPackage_hoNumber_key" ON "HandoverPackage"("hoNumber");

-- CreateIndex
CREATE INDEX "HandoverPackage_projectId_idx" ON "HandoverPackage"("projectId");

-- CreateIndex
CREATE INDEX "HandoverPackage_status_idx" ON "HandoverPackage"("status");

-- CreateIndex
CREATE INDEX "HandoverItem_handoverId_idx" ON "HandoverItem"("handoverId");

-- AddForeignKey
ALTER TABLE "CommissioningSystem" ADD CONSTRAINT "CommissioningSystem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissioningSystem" ADD CONSTRAINT "CommissioningSystem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommissioningSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverPackage" ADD CONSTRAINT "HandoverPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverItem" ADD CONSTRAINT "HandoverItem_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "HandoverPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
