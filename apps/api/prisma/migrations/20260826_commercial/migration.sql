-- CreateTable
CREATE TABLE "Client" (
-- CreateTable
CREATE TABLE "Opportunity" (
-- CreateTable
CREATE TABLE "Contract" (
-- CreateIndex
CREATE UNIQUE INDEX "Client_clientCode_key" ON "Client"("clientCode");
-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");
-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_oppNumber_key" ON "Opportunity"("oppNumber");
-- CreateIndex
CREATE INDEX "Opportunity_clientId_idx" ON "Opportunity"("clientId");
-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");
-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");
-- CreateIndex
CREATE INDEX "Contract_projectId_idx" ON "Contract"("projectId");
-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");
-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");
-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
