-- Project lifecycle (FR-PRJ-007): fase + stage-gate + milestone, time-phased
-- budget (dasar S-curve), progress fisik, stakeholder & kalender.
--
-- ADITIF penuh: enum baru, tabel baru, dan kolom baru dengan DEFAULT sehingga
-- baris lama tetap valid tanpa backfill wajib.

-- 1) Enum baru
CREATE TYPE "ProjectPhase" AS ENUM ('INITIATION', 'FEED', 'ENGINEERING', 'PROCUREMENT', 'CONSTRUCTION', 'COMMISSIONING', 'CLOSEOUT');
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'ACHIEVED', 'MISSED');
CREATE TYPE "GateDecision" AS ENUM ('GO', 'HOLD', 'NO_GO');
CREATE TYPE "ProjectHealthStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'CRITICAL', 'ON_HOLD', 'COMPLETED');

-- 2) Kolom baru Project
ALTER TABLE "Project" ADD COLUMN "phase" "ProjectPhase" NOT NULL DEFAULT 'INITIATION';
ALTER TABLE "Project" ADD COLUMN "healthStatus" "ProjectHealthStatus" NOT NULL DEFAULT 'ON_TRACK';
ALTER TABLE "Project" ADD COLUMN "progressPlanned" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN "progressActual" DECIMAL(5,2) NOT NULL DEFAULT 0;
CREATE INDEX "Project_phase_idx" ON "Project"("phase");

-- 3) Progress fisik per WBS
ALTER TABLE "WbsItem" ADD COLUMN "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- 4) Riwayat fase
CREATE TABLE "ProjectPhaseHistory" (
  "id"        TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phase"     "ProjectPhase" NOT NULL,
  "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "exitedAt"  TIMESTAMP(3),
  "movedById" TEXT,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectPhaseHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectPhaseHistory_projectId_idx" ON "ProjectPhaseHistory"("projectId");
CREATE INDEX "ProjectPhaseHistory_phase_idx" ON "ProjectPhaseHistory"("phase");
ALTER TABLE "ProjectPhaseHistory" ADD CONSTRAINT "ProjectPhaseHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Milestone
CREATE TABLE "ProjectMilestone" (
  "id"          TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "plannedDate" TIMESTAMP(3) NOT NULL,
  "actualDate"  TIMESTAMP(3),
  "status"      "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
  "weight"      DECIMAL(5,2) NOT NULL DEFAULT 0,
  "isCritical"  BOOLEAN NOT NULL DEFAULT false,
  "notes"       TEXT,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");
CREATE INDEX "ProjectMilestone_status_idx" ON "ProjectMilestone"("status");
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) Stage-gate review
CREATE TABLE "StageGateReview" (
  "id"         TEXT NOT NULL,
  "projectId"  TEXT NOT NULL,
  "gate"       TEXT NOT NULL,
  "phase"      "ProjectPhase" NOT NULL,
  "decision"   "GateDecision" NOT NULL DEFAULT 'HOLD',
  "reviewerId" TEXT,
  "decidedAt"  TIMESTAMP(3),
  "notes"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StageGateReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StageGateReview_projectId_idx" ON "StageGateReview"("projectId");
CREATE INDEX "StageGateReview_decision_idx" ON "StageGateReview"("decision");
ALTER TABLE "StageGateReview" ADD CONSTRAINT "StageGateReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7) Time-phased budget (S-curve)
CREATE TABLE "ProjectPeriodBudget" (
  "id"          TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "period"      TEXT NOT NULL,
  "plannedCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectPeriodBudget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectPeriodBudget_projectId_period_key" ON "ProjectPeriodBudget"("projectId", "period");
CREATE INDEX "ProjectPeriodBudget_projectId_idx" ON "ProjectPeriodBudget"("projectId");
ALTER TABLE "ProjectPeriodBudget" ADD CONSTRAINT "ProjectPeriodBudget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8) Stakeholder (RACI)
CREATE TABLE "ProjectStakeholder" (
  "id"         TEXT NOT NULL,
  "projectId"  TEXT NOT NULL,
  "employeeId" TEXT,
  "name"       TEXT NOT NULL,
  "role"       TEXT NOT NULL,
  "raci"       TEXT NOT NULL DEFAULT 'INFORMED',
  "email"      TEXT,
  "phone"      TEXT,
  "isPrimary"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectStakeholder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectStakeholder_projectId_idx" ON "ProjectStakeholder"("projectId");
ALTER TABLE "ProjectStakeholder" ADD CONSTRAINT "ProjectStakeholder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9) Kalender kerja
CREATE TABLE "ProjectCalendar" (
  "id"           TEXT NOT NULL,
  "projectId"    TEXT NOT NULL,
  "date"         TIMESTAMP(3) NOT NULL,
  "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,
  "note"         TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectCalendar_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectCalendar_projectId_date_key" ON "ProjectCalendar"("projectId", "date");
CREATE INDEX "ProjectCalendar_projectId_idx" ON "ProjectCalendar"("projectId");
ALTER TABLE "ProjectCalendar" ADD CONSTRAINT "ProjectCalendar_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10) Backfill fase & riwayat dari status yang ada (agar ribbon fase bermakna
-- untuk data lama). COMPLETED/CLOSED → CLOSEOUT; ON_HOLD tetap di fase awalnya.
UPDATE "Project" SET "phase" = 'CONSTRUCTION' WHERE "status" = 'ACTIVE' AND "phase" = 'INITIATION';
UPDATE "Project" SET "phase" = 'CLOSEOUT' WHERE "status" IN ('COMPLETED', 'CLOSED');

INSERT INTO "ProjectPhaseHistory" ("id", "projectId", "phase", "enteredAt", "note")
SELECT gen_random_uuid()::text, p."id", p."phase", COALESCE(p."startDate", p."createdAt"), 'Backfilled from status'
FROM "Project" p;
