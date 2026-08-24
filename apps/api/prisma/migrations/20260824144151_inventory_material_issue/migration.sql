-- CreateTable
CREATE TABLE "MaterialIssue" (
    "id" TEXT NOT NULL,
    "issueNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "issuedTo" TEXT NOT NULL,
    "issueReason" TEXT NOT NULL DEFAULT 'CONSTRUCTION',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedBy" TEXT NOT NULL,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssueItem" (
    "id" TEXT NOT NULL,
    "materialIssueId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "unitPrice" DECIMAL(18,2),
    "totalValue" DECIMAL(18,2),
    "wbsItemId" TEXT,

    CONSTRAINT "MaterialIssueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialIssue_issueNumber_key" ON "MaterialIssue"("issueNumber");

-- CreateIndex
CREATE INDEX "MaterialIssue_projectId_idx" ON "MaterialIssue"("projectId");

-- CreateIndex
CREATE INDEX "MaterialIssue_warehouseId_idx" ON "MaterialIssue"("warehouseId");

-- CreateIndex
CREATE INDEX "MaterialIssue_status_idx" ON "MaterialIssue"("status");

-- CreateIndex
CREATE INDEX "MaterialIssueItem_materialIssueId_idx" ON "MaterialIssueItem"("materialIssueId");

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItem" ADD CONSTRAINT "MaterialIssueItem_materialIssueId_fkey" FOREIGN KEY ("materialIssueId") REFERENCES "MaterialIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItem" ADD CONSTRAINT "MaterialIssueItem_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WbsItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
