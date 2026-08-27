
-- CreateTable
CREATE TABLE "SafetyObservation" (
    "id" TEXT NOT NULL,
    "observationNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "observationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'UNSAFE',
    "description" TEXT NOT NULL,
    "observedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseIncident" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "incidentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'NEAR_MISS',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "rootCause" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "reportedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitToWork" (
    "id" TEXT NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "area" TEXT NOT NULL,
    "description" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "issuedTo" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermitToWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "incidentId" TEXT,
    "action" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SafetyObservation_observationNumber_key" ON "SafetyObservation"("observationNumber");

-- CreateIndex
CREATE INDEX "SafetyObservation_projectId_idx" ON "SafetyObservation"("projectId");

-- CreateIndex
CREATE INDEX "SafetyObservation_type_idx" ON "SafetyObservation"("type");

-- CreateIndex
CREATE INDEX "SafetyObservation_status_idx" ON "SafetyObservation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HseIncident_incidentNumber_key" ON "HseIncident"("incidentNumber");

-- CreateIndex
CREATE INDEX "HseIncident_projectId_idx" ON "HseIncident"("projectId");

-- CreateIndex
CREATE INDEX "HseIncident_severity_idx" ON "HseIncident"("severity");

-- CreateIndex
CREATE INDEX "HseIncident_status_idx" ON "HseIncident"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PermitToWork_permitNumber_key" ON "PermitToWork"("permitNumber");

-- CreateIndex
CREATE INDEX "PermitToWork_projectId_idx" ON "PermitToWork"("projectId");

-- CreateIndex
CREATE INDEX "PermitToWork_status_idx" ON "PermitToWork"("status");

-- CreateIndex
CREATE INDEX "CorrectiveAction_sourceType_sourceId_idx" ON "CorrectiveAction"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_status_idx" ON "CorrectiveAction"("status");

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseIncident" ADD CONSTRAINT "HseIncident_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitToWork" ADD CONSTRAINT "PermitToWork_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "HseIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

