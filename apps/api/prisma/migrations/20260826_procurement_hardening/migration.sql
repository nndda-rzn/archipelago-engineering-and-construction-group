
-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PurchaseRequisition" ADD COLUMN     "estimatedTotal" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "RfqQuote" ADD COLUMN     "technicalNote" TEXT,
ADD COLUMN     "technicalStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "PurchaseOrderChange" (
    "id" TEXT NOT NULL,
    "changeNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousTotal" DECIMAL(18,2) NOT NULL,
    "newTotal" DECIMAL(18,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPerformanceRating" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "projectId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'DELIVERY',
    "score" INTEGER NOT NULL,
    "remark" TEXT,
    "ratedBy" TEXT NOT NULL,
    "ratingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPerformanceRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderChange_changeNumber_key" ON "PurchaseOrderChange"("changeNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderChange_purchaseOrderId_idx" ON "PurchaseOrderChange"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderChange_status_idx" ON "PurchaseOrderChange"("status");

-- CreateIndex
CREATE INDEX "VendorPerformanceRating_vendorId_idx" ON "VendorPerformanceRating"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPerformanceRating_category_idx" ON "VendorPerformanceRating"("category");

-- AddForeignKey
ALTER TABLE "PurchaseOrderChange" ADD CONSTRAINT "PurchaseOrderChange_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPerformanceRating" ADD CONSTRAINT "VendorPerformanceRating_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPerformanceRating" ADD CONSTRAINT "VendorPerformanceRating_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

