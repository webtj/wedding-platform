/*
  Warnings:

  - The `status` column on the `wedding_timeline_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TimelineItemStatus" AS ENUM ('pending', 'ready', 'in_progress', 'done', 'canceled');

-- AlterTable
ALTER TABLE "wedding_timeline_items" ADD COLUMN     "reminderMinutesBefore" INTEGER,
ADD COLUMN     "visibleToCouple" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "status",
ADD COLUMN     "status" "TimelineItemStatus" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "wedding_timeline_items_tenantId_projectId_startTime_idx" ON "wedding_timeline_items"("tenantId", "projectId", "startTime");
