-- Add index [projectId, status] composite for finance list endpoints that filter
-- by both projectId and status simultaneously (listVendorInvoices, listClientInvoices,
-- listProgressClaims, listCollections, listPayments, listVariations, listSubcontracts).
-- Follows precedent migration 20260830_add_projectid_status_index (PR/PO).
CREATE INDEX "VendorInvoice_projectId_status_idx" ON "VendorInvoice"("projectId", "status");
CREATE INDEX "ClientInvoice_projectId_status_idx" ON "ClientInvoice"("projectId", "status");
CREATE INDEX "ProgressClaim_projectId_status_idx" ON "ProgressClaim"("projectId", "status");
CREATE INDEX "Collection_projectId_status_idx" ON "Collection"("projectId", "status");
CREATE INDEX "Payment_projectId_status_idx" ON "Payment"("projectId", "status");
CREATE INDEX "ProjectVariation_projectId_status_idx" ON "ProjectVariation"("projectId", "status");
CREATE INDEX "Subcontract_projectId_status_idx" ON "Subcontract"("projectId", "status");
