-- Project schema (FR-PRJ-001): status/type/priority enum, manager & director as real
-- people (relation to Employee), richer team assignment, and a project activity log.
--
-- ADITIF kecuali satu konversi enum: `Project.status` TEXT -> enum (semua baris
-- existing bernilai salah satu dari PLANNING/ACTIVE/ON_HOLD/COMPLETED/CLOSED, jadi
-- cast aman tanpa kehilangan data).

-- 1) Enum baru
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED');
CREATE TYPE "ProjectType" AS ENUM ('EPC', 'MARINE', 'POWER', 'PROCESS', 'INFRASTRUCTURE', 'OTHER');
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- 2) Project.status TEXT -> enum
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus" USING ("status"::text::"ProjectStatus");
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'PLANNING';

-- 3) Kolom baru Project
ALTER TABLE "Project" ADD COLUMN "type" "ProjectType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "Project" ADD COLUMN "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Project" ADD COLUMN "directorId" TEXT;
ALTER TABLE "Project" ADD COLUMN "managerId" TEXT;

ALTER TABLE "Project" ADD CONSTRAINT "Project_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Project_type_idx" ON "Project"("type");
CREATE INDEX "Project_priority_idx" ON "Project"("priority");

-- 4) ProjectAssignment: key member + alasan berakhir
ALTER TABLE "ProjectAssignment" ADD COLUMN "isKeyMember" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProjectAssignment" ADD COLUMN "endedReason" TEXT;
CREATE INDEX "ProjectAssignment_projectId_status_idx" ON "ProjectAssignment"("projectId", "status");

-- 5) Timeline proyek
CREATE TABLE "ProjectActivity" (
  "id"        TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "actorId"   TEXT,
  "action"    TEXT NOT NULL,
  "summary"   TEXT NOT NULL,
  "metadata"  JSONB,
  "at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectActivity_projectId_idx" ON "ProjectActivity"("projectId");
CREATE INDEX "ProjectActivity_at_idx" ON "ProjectActivity"("at");
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) Backfill jenis proyek dari kode (PRJ-EPC-* → EPC, dsb.) supaya label tak seragam "OTHER".
UPDATE "Project" SET "type" = 'MARINE' WHERE "code" LIKE '%MARINE%' OR "businessUnit" = 'MARINE';
UPDATE "Project" SET "type" = 'POWER' WHERE "type" = 'OTHER' AND ("businessUnit" = 'POWER' OR "code" LIKE '%POWER%');
UPDATE "Project" SET "type" = 'PROCESS' WHERE "type" = 'OTHER' AND "businessUnit" = 'PROCESS';
UPDATE "Project" SET "type" = 'EPC' WHERE "type" = 'OTHER' AND "code" LIKE 'PRJ-EPC-%';
