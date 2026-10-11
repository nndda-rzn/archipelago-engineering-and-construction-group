-- Role Management schema (FR-FND-004): kategori role, kelompok izin, scope enum,
-- jejak pemberian izin, dan timeline role.
--
-- ADITIF kecuali satu konversi enum: `RolePermission.scopeType` TEXT -> enum
-- (semua baris existing bernilai 'GLOBAL', jadi cast aman tanpa kehilangan data).

-- 1) Enum baru
CREATE TYPE "RoleCategory" AS ENUM ('SYSTEM', 'FUNCTIONAL', 'PROJECT', 'CUSTOM');
CREATE TYPE "PermissionScope" AS ENUM ('GLOBAL', 'LEGAL_ENTITY', 'BUSINESS_UNIT', 'PROJECT');
CREATE TYPE "PermissionGroup" AS ENUM (
  'FOUNDATION', 'PROCUREMENT', 'FINANCE', 'TREASURY', 'PROJECT', 'CONSTRUCTION',
  'INVENTORY', 'HSE', 'QUALITY', 'COMMERCIAL', 'ANALYTICS', 'GOVERNANCE', 'HCM',
  'ENGINEERING', 'MASTER_DATA'
);

-- 2) Role: kategori + flag + jejak pembuat
ALTER TABLE "Role" ADD COLUMN "category" "RoleCategory" NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "Role" ADD COLUMN "isAssignable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Role" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Role" ADD COLUMN "updatedById" TEXT;
CREATE INDEX "Role_category_idx" ON "Role"("category");

-- 3) Permission: kelompok + sensitif + urutan
ALTER TABLE "Permission" ADD COLUMN "group" "PermissionGroup";
ALTER TABLE "Permission" ADD COLUMN "isSensitive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Permission" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Permission_group_idx" ON "Permission"("group");
CREATE INDEX "Permission_resource_idx" ON "Permission"("resource");

-- 4) RolePermission: scopeType TEXT -> enum, plus jejak pemberian
ALTER TABLE "RolePermission" ALTER COLUMN "scopeType" DROP DEFAULT;
ALTER TABLE "RolePermission" ALTER COLUMN "scopeType" TYPE "PermissionScope" USING ("scopeType"::text::"PermissionScope");
ALTER TABLE "RolePermission" ALTER COLUMN "scopeType" SET DEFAULT 'GLOBAL';
ALTER TABLE "RolePermission" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RolePermission" ADD COLUMN "grantedById" TEXT;
ALTER TABLE "RolePermission" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- 5) Timeline role
CREATE TABLE "RoleActivity" (
  "id"       TEXT NOT NULL,
  "roleId"   TEXT NOT NULL,
  "actorId"  TEXT,
  "action"   TEXT NOT NULL,
  "summary"  TEXT NOT NULL,
  "metadata" JSONB,
  "at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RoleActivity_roleId_idx" ON "RoleActivity"("roleId");
CREATE INDEX "RoleActivity_at_idx" ON "RoleActivity"("at");
ALTER TABLE "RoleActivity" ADD CONSTRAINT "RoleActivity_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) Backfill: kelompok izin per resource + tandai izin sensitif (kode sama dengan
-- SENSITIVE_PERMISSIONS di @aec/shared-types).
UPDATE "Permission" SET "group" = g.grp::"PermissionGroup"
FROM (VALUES
  ('AccessReview','FOUNDATION'),('Audit','FOUNDATION'),('FoundationHardening','FOUNDATION'),
  ('LegalEntity','FOUNDATION'),('Role','FOUNDATION'),('User','FOUNDATION'),
  ('GoodsReceipt','PROCUREMENT'),('ProcurementHardening','PROCUREMENT'),
  ('PurchaseOrder','PROCUREMENT'),('PurchaseRequisition','PROCUREMENT'),('Rfq','PROCUREMENT'),
  ('Vendor','PROCUREMENT'),('VendorInvoice','PROCUREMENT'),
  ('Budget','FINANCE'),('ChartOfAccount','FINANCE'),('Client','FINANCE'),('ClientInvoice','FINANCE'),
  ('Collection','FINANCE'),('Commissioning','FINANCE'),('CostCode','FINANCE'),('Forecast','FINANCE'),
  ('Journal','FINANCE'),('Payment','FINANCE'),('ProgressClaim','FINANCE'),
  ('Treasury','TREASURY'),
  ('Contract','PROJECT'),('ControlAccount','PROJECT'),('Project','PROJECT'),('Variation','PROJECT'),
  ('WBS','PROJECT'),('WorkPackage','PROJECT'),
  ('DailyReport','CONSTRUCTION'),('Equipment','CONSTRUCTION'),('EquipmentAssignment','CONSTRUCTION'),
  ('Handover','CONSTRUCTION'),('PermitToWork','CONSTRUCTION'),('Subcontract','CONSTRUCTION'),
  ('SubcontractProgress','CONSTRUCTION'),('Timesheet','CONSTRUCTION'),
  ('MaterialIssue','INVENTORY'),('StockAdjustment','INVENTORY'),('StockLedger','INVENTORY'),
  ('StockOpname','INVENTORY'),('StockTransfer','INVENTORY'),('Warehouse','INVENTORY'),
  ('CorrectiveAction','HSE'),('HseIncident','HSE'),('SafetyObservation','HSE'),
  ('Quality','QUALITY'),('Opportunity','COMMERCIAL'),('Analytics','ANALYTICS'),
  ('Approval','GOVERNANCE'),('LegalCase','GOVERNANCE'),('Risk','GOVERNANCE'),('Workflow','GOVERNANCE'),
  ('Employee','HCM'),('EmployeeAssignment','HCM'),('Payroll','HCM'),
  ('Engineering','ENGINEERING'),
  ('Currency','MASTER_DATA'),('FiscalPeriod','MASTER_DATA'),('MasterData','MASTER_DATA'),('NumberSequence','MASTER_DATA')
) AS g(res, grp)
WHERE "Permission"."resource" = g.res;

UPDATE "Permission" SET "isSensitive" = true WHERE "code" IN (
  'Role.DELETE','Role.EDIT','User.BLOCK','User.EDIT','User.MANAGE_ROLE','User.RESET_PASSWORD',
  'Treasury.RELEASE','Journal.AUTO_POST','Payment.APPROVE','VendorInvoice.POST',
  'LegalEntity.EDIT','Workflow.DELETE'
);
