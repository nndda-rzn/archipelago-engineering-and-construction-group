-- CreateTable
CREATE TABLE "ConstructionDailyReport" (
    "id" TEXT NOT NULL,
    "drNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weather" TEXT,
    "temperatureC" DECIMAL(4,1),
    "summary" TEXT NOT NULL,
    "issues" TEXT,
    "hseNote" TEXT,
    "qualityNote" TEXT,
    "manpowerTotal" INTEGER NOT NULL DEFAULT 0,
    "equipmentList" TEXT,
    "materialList" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reportedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstructionDailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReportManpower" (
    "id" TEXT NOT NULL,
    "dailyReportId" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "manpowerCount" INTEGER NOT NULL,
    "hoursWorked" DECIMAL(5,2) NOT NULL,
    "note" TEXT,

    CONSTRAINT "DailyReportManpower_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionDailyReport_drNumber_key" ON "ConstructionDailyReport"("drNumber");

-- CreateIndex
CREATE INDEX "ConstructionDailyReport_projectId_idx" ON "ConstructionDailyReport"("projectId");

-- CreateIndex
CREATE INDEX "ConstructionDailyReport_reportDate_idx" ON "ConstructionDailyReport"("reportDate");

-- CreateIndex
CREATE INDEX "DailyReportManpower_dailyReportId_idx" ON "DailyReportManpower"("dailyReportId");

-- AddForeignKey
ALTER TABLE "ConstructionDailyReport" ADD CONSTRAINT "ConstructionDailyReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReportManpower" ADD CONSTRAINT "DailyReportManpower_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "ConstructionDailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
