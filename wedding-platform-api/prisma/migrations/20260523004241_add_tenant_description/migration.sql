-- CreateEnum
CREATE TYPE "PlanPackageStatus" AS ENUM ('draft', 'active', 'retired');

-- CreateEnum
CREATE TYPE "TenantSubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'suspended', 'canceled');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly', 'manual');

-- CreateEnum
CREATE TYPE "PlatformChannelType" AS ENUM ('web', 'wechat_mini', 'douyin_mini');

-- CreateEnum
CREATE TYPE "PlatformChannelStatus" AS ENUM ('draft', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('draft', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('venue', 'floral', 'photo_video', 'makeup', 'production', 'host', 'other');

-- CreateEnum
CREATE TYPE "PublicCaseStatus" AS ENUM ('draft', 'review', 'published', 'archived');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "plan_packages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPriceCents" INTEGER NOT NULL,
    "yearlyPriceCents" INTEGER NOT NULL,
    "maxProjects" INTEGER NOT NULL,
    "maxMembers" INTEGER NOT NULL,
    "storageGb" INTEGER NOT NULL,
    "aiCreditsMonthly" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "status" "PlanPackageStatus" NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planPackageId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "status" "TenantSubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "renewsAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "projectCount" INTEGER NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "storageBytes" BIGINT NOT NULL,
    "aiCreditsUsed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_bindings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "channel" "PlatformChannelType" NOT NULL,
    "name" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "status" "PlatformChannelStatus" NOT NULL DEFAULT 'draft',
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "city" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "status" "VendorStatus" NOT NULL DEFAULT 'draft',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_cases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "vendorId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "coverAssetId" TEXT,
    "status" "PublicCaseStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_packages_code_key" ON "plan_packages"("code");

-- CreateIndex
CREATE INDEX "plan_packages_status_sortOrder_idx" ON "plan_packages"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_tenantId_key" ON "tenant_subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_planPackageId_idx" ON "tenant_subscriptions"("planPackageId");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_status_idx" ON "tenant_subscriptions"("status");

-- CreateIndex
CREATE INDEX "usage_snapshots_month_idx" ON "usage_snapshots"("month");

-- CreateIndex
CREATE UNIQUE INDEX "usage_snapshots_tenantId_month_key" ON "usage_snapshots"("tenantId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE INDEX "platform_settings_group_idx" ON "platform_settings"("group");

-- CreateIndex
CREATE INDEX "channel_bindings_channel_status_idx" ON "channel_bindings"("channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "channel_bindings_tenantId_channel_appId_key" ON "channel_bindings"("tenantId", "channel", "appId");

-- CreateIndex
CREATE INDEX "vendor_profiles_tenantId_category_status_idx" ON "vendor_profiles"("tenantId", "category", "status");

-- CreateIndex
CREATE INDEX "vendor_profiles_city_idx" ON "vendor_profiles"("city");

-- CreateIndex
CREATE UNIQUE INDEX "public_cases_projectId_key" ON "public_cases"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "public_cases_slug_key" ON "public_cases"("slug");

-- CreateIndex
CREATE INDEX "public_cases_tenantId_status_idx" ON "public_cases"("tenantId", "status");

-- CreateIndex
CREATE INDEX "public_cases_vendorId_idx" ON "public_cases"("vendorId");

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_planPackageId_fkey" FOREIGN KEY ("planPackageId") REFERENCES "plan_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_snapshots" ADD CONSTRAINT "usage_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_bindings" ADD CONSTRAINT "channel_bindings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_cases" ADD CONSTRAINT "public_cases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_cases" ADD CONSTRAINT "public_cases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_cases" ADD CONSTRAINT "public_cases_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_cases" ADD CONSTRAINT "public_cases_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
