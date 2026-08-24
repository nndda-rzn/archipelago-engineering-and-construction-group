-- CreateTable
CREATE TABLE "WbsItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WbsItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WbsItem_projectId_idx" ON "WbsItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WbsItem_projectId_code_key" ON "WbsItem"("projectId", "code");

-- AddForeignKey
ALTER TABLE "WbsItem" ADD CONSTRAINT "WbsItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsItem" ADD CONSTRAINT "WbsItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WbsItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
