-- Master Data integrity: enum untuk Vendor (category, status), FiscalPeriod (status),
-- dan NumberSequence (status) + index pendukung jalur query baru.
--
-- Konversi `TEXT -> enum` memakai USING cast (bukan drop+create) agar nilai lama
-- (MATERIAL/ACTIVE/FUTURE/...) dipertahankan. Pola sama dengan migrasi
-- 20261013_legal_entity_integrity dan 20261014_foundation_hardening_integrity.

-- 1) Enum tipe
CREATE TYPE "VendorCategory" AS ENUM ('MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER');
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "FiscalPeriodStatus" AS ENUM ('FUTURE', 'OPEN', 'SOFT_CLOSED', 'CLOSED', 'LOCKED');
CREATE TYPE "NumberSequenceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- 2) Vendor.category TEXT -> enum
ALTER TABLE "Vendor" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Vendor" ALTER COLUMN "category" TYPE "VendorCategory" USING ("category"::text::"VendorCategory");
ALTER TABLE "Vendor" ALTER COLUMN "category" SET DEFAULT 'MATERIAL';

-- 3) Vendor.status TEXT -> enum
ALTER TABLE "Vendor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Vendor" ALTER COLUMN "status" TYPE "VendorStatus" USING ("status"::text::"VendorStatus");
ALTER TABLE "Vendor" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 4) FiscalPeriod.status TEXT -> enum
ALTER TABLE "FiscalPeriod" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "FiscalPeriod" ALTER COLUMN "status" TYPE "FiscalPeriodStatus" USING ("status"::text::"FiscalPeriodStatus");
ALTER TABLE "FiscalPeriod" ALTER COLUMN "status" SET DEFAULT 'FUTURE';

-- 5) NumberSequence.status TEXT -> enum
ALTER TABLE "NumberSequence" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "NumberSequence" ALTER COLUMN "status" TYPE "NumberSequenceStatus" USING ("status"::text::"NumberSequenceStatus");
ALTER TABLE "NumberSequence" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 6) Index pendukung jalur query baru (pencarian vendor + kalender periode per tahun)
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");
CREATE INDEX "FiscalPeriod_periodYear_idx" ON "FiscalPeriod"("periodYear");
