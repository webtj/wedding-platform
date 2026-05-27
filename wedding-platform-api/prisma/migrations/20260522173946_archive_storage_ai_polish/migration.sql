-- CreateEnum
CREATE TYPE "ArchivePackageStatus" AS ENUM ('queued', 'processing', 'ready', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "ArchivePackageType" AS ENUM ('full_project', 'assets_only', 'couple_delivery', 'case_draft');

-- CreateEnum
CREATE TYPE "RetentionReminderStatus" AS ENUM ('pending', 'sent', 'dismissed');

-- CreateEnum
CREATE TYPE "AiTemplateCategory" AS ENUM ('couple', 'planner_marketing', 'timeline', 'case_study');

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "archiveNote" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "asset_retention_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "archiveAfterDays" INTEGER NOT NULL DEFAULT 0,
    "notifyBeforeDays" INTEGER NOT NULL DEFAULT 30,
    "allowCoupleDownload" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_reminders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT,
    "title" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "status" "RetentionReminderStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_packages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ArchivePackageType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ArchivePackageStatus" NOT NULL DEFAULT 'queued',
    "objectKey" TEXT,
    "sizeBytes" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archive_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_package_items" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archive_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AiTemplateCategory" NOT NULL,
    "prompt" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_output_versions" (
    "id" TEXT NOT NULL,
    "outputId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_output_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_retention_policies_projectId_key" ON "asset_retention_policies"("projectId");

-- CreateIndex
CREATE INDEX "asset_retention_policies_tenantId_idx" ON "asset_retention_policies"("tenantId");

-- CreateIndex
CREATE INDEX "retention_reminders_tenantId_status_remindAt_idx" ON "retention_reminders"("tenantId", "status", "remindAt");

-- CreateIndex
CREATE INDEX "archive_packages_tenantId_projectId_status_idx" ON "archive_packages"("tenantId", "projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "archive_package_items_packageId_assetId_key" ON "archive_package_items"("packageId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_templates_tenantId_code_key" ON "ai_templates"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ai_output_versions_outputId_version_key" ON "ai_output_versions"("outputId", "version");

-- AddForeignKey
ALTER TABLE "asset_retention_policies" ADD CONSTRAINT "asset_retention_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_retention_policies" ADD CONSTRAINT "asset_retention_policies_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_reminders" ADD CONSTRAINT "retention_reminders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_reminders" ADD CONSTRAINT "retention_reminders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_reminders" ADD CONSTRAINT "retention_reminders_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_packages" ADD CONSTRAINT "archive_packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_packages" ADD CONSTRAINT "archive_packages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_package_items" ADD CONSTRAINT "archive_package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "archive_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_package_items" ADD CONSTRAINT "archive_package_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_templates" ADD CONSTRAINT "ai_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_output_versions" ADD CONSTRAINT "ai_output_versions_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "ai_outputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
