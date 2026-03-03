-- AlterTable
ALTER TABLE "Task" ADD COLUMN "archivedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_archivedAt_idx" ON "Task"("archivedAt");
