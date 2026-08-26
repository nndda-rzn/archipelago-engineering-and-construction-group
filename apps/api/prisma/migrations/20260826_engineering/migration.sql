
-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "deliverableNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "discipline" TEXT NOT NULL DEFAULT 'PIPING',
    "engineer" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3),
    "forecastDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "drawingNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "discipline" TEXT NOT NULL DEFAULT 'PIPING',
    "currentRevision" TEXT NOT NULL DEFAULT '0',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingRevision" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "description" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT NOT NULL,

    CONSTRAINT "DrawingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfi" (
    "id" TEXT NOT NULL,
    "rfiNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "impactCost" DECIMAL(18,2),
    "impactScheduleDays" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT NOT NULL,
    "answeredBy" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rfi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submittal" (
    "id" TEXT NOT NULL,
    "submittalNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "responseNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submittal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transmittal" (
    "id" TEXT NOT NULL,
    "transmittalNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "documentList" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transmittal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deliverable_deliverableNumber_key" ON "Deliverable"("deliverableNumber");

-- CreateIndex
CREATE INDEX "Deliverable_projectId_idx" ON "Deliverable"("projectId");

-- CreateIndex
CREATE INDEX "Deliverable_discipline_idx" ON "Deliverable"("discipline");

-- CreateIndex
CREATE INDEX "Deliverable_status_idx" ON "Deliverable"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Drawing_drawingNumber_key" ON "Drawing"("drawingNumber");

-- CreateIndex
CREATE INDEX "Drawing_projectId_idx" ON "Drawing"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingRevision_drawingId_revision_key" ON "DrawingRevision"("drawingId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Rfi_rfiNumber_key" ON "Rfi"("rfiNumber");

-- CreateIndex
CREATE INDEX "Rfi_projectId_idx" ON "Rfi"("projectId");

-- CreateIndex
CREATE INDEX "Rfi_status_idx" ON "Rfi"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Submittal_submittalNumber_key" ON "Submittal"("submittalNumber");

-- CreateIndex
CREATE INDEX "Submittal_projectId_idx" ON "Submittal"("projectId");

-- CreateIndex
CREATE INDEX "Submittal_status_idx" ON "Submittal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Transmittal_transmittalNumber_key" ON "Transmittal"("transmittalNumber");

-- CreateIndex
CREATE INDEX "Transmittal_projectId_idx" ON "Transmittal"("projectId");

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfi" ADD CONSTRAINT "Rfi_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transmittal" ADD CONSTRAINT "Transmittal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

