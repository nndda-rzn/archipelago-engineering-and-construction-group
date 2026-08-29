-- Add index [projectId, status] composite for PurchaseRequisition and PurchaseOrder models
-- to optimize list filters by both projectId and status simultaneously.
CREATE INDEX "PurchaseRequisition_projectId_status_idx" ON "PurchaseRequisition"("projectId", "status");
CREATE INDEX "PurchaseOrder_projectId_status_idx" ON "PurchaseOrder"("projectId", "status");
