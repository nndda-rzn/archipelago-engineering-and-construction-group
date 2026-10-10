-- Legal Entity integrity: status enum, currency FKs (with seed+backfill), missing indexes.
--
-- Urutan penting: seed Currency LEBIH DULU sebelum menambah FK, dan backfill
-- kolom id dari kode yang ada. Kode mata uang yang tidak dikenal sengaja
-- dibiarkan NULL (kolom nullable) supaya migrasi tidak gagal pada data apa pun.
-- Konversi `status` memakai USING cast (bukan drop+create) agar data lama
-- (ACTIVE/BLOCKED) dipertahankan.

-- 1) Enum status (cermin MasterDataStatus)
CREATE TYPE "LegalEntityStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'BLOCKED', 'INACTIVE', 'ARCHIVED');

-- 2) Seed mata uang yang dipakai seed aplikasi (idempoten).
INSERT INTO "Currency" ("id", "code", "name", "symbol", "decimals", "isActive", "createdAt", "updatedAt")
VALUES
  ('cur-idr', 'IDR', 'Indonesian Rupiah', 'Rp', 2, true, now(), now()),
  ('cur-usd', 'USD', 'US Dollar', '$', 2, true, now(), now())
ON CONFLICT ("code") DO NOTHING;

-- 3) Kolom FK baru (nullable)
ALTER TABLE "LegalEntity" ADD COLUMN "functionalCurrencyId" TEXT;
ALTER TABLE "LegalEntity" ADD COLUMN "reportingCurrencyId" TEXT;

-- 4) Backfill dari kode yang sudah ada (kode tak dikenal → tetap NULL)
UPDATE "LegalEntity" le SET "functionalCurrencyId" = c."id" FROM "Currency" c WHERE c."code" = le."functionalCurrency";
UPDATE "LegalEntity" le SET "reportingCurrencyId"  = c."id" FROM "Currency" c WHERE c."code" = le."reportingCurrency";

-- 5) Konversi status TEXT → enum tanpa kehilangan data
ALTER TABLE "LegalEntity" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LegalEntity" ALTER COLUMN "status" TYPE "LegalEntityStatus" USING ("status"::text::"LegalEntityStatus");
ALTER TABLE "LegalEntity" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 6) Foreign keys
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_functionalCurrencyId_fkey" FOREIGN KEY ("functionalCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_reportingCurrencyId_fkey" FOREIGN KEY ("reportingCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7) Index (menutup celah query usage & filter status)
CREATE INDEX "LegalEntity_status_idx" ON "LegalEntity"("status");
CREATE INDEX "Organization_legalEntityId_idx" ON "Organization"("legalEntityId");
CREATE INDEX "User_legalEntityId_idx" ON "User"("legalEntityId");
CREATE INDEX "Equipment_legalEntityId_idx" ON "Equipment"("legalEntityId");
