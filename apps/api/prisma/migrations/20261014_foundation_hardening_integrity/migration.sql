-- Foundation Hardening integrity: DoaRule status enum + indexes for the new
-- query paths (org effective-dated lookup, exchange-rate history, active rules
-- per transaction type).
--
-- Konversi `status` memakai USING cast (bukan drop+create) agar nilai lama
-- (ACTIVE/INACTIVE) dipertahankan.

-- 1) Enum status aturan DoA
CREATE TYPE "DoaRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- 2) status TEXT -> enum tanpa kehilangan data
ALTER TABLE "DoaRule" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DoaRule" ALTER COLUMN "status" TYPE "DoaRuleStatus" USING ("status"::text::"DoaRuleStatus");
ALTER TABLE "DoaRule" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 3) Index (menutup jalur query baru)
CREATE INDEX "Organization_legalEntityId_effectiveFrom_effectiveTo_idx" ON "Organization"("legalEntityId", "effectiveFrom", "effectiveTo");
CREATE INDEX "ExchangeRate_fromCurrencyId_toCurrencyId_effectiveDate_idx" ON "ExchangeRate"("fromCurrencyId", "toCurrencyId", "effectiveDate");
CREATE INDEX "DoaRule_transactionType_status_idx" ON "DoaRule"("transactionType", "status");
