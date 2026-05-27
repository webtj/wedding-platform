-- CreateEnum
CREATE TYPE "ProjectStageStatus" AS ENUM ('pending', 'active', 'done', 'skipped');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('draft', 'pending_review', 'signed', 'completed', 'voided');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank_transfer', 'wechat', 'alipay', 'other');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('venue', 'floral', 'photo_video', 'makeup', 'production', 'travel', 'other');

-- CreateTable
CREATE TABLE "project_stages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStageStatus" NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'draft',
    "signedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_items" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "note" TEXT,
    "voucherAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_expenses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "voucherAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_stages_tenantId_projectId_sortOrder_idx" ON "project_stages"("tenantId", "projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "contracts_tenantId_projectId_idx" ON "contracts"("tenantId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_tenantId_contractNo_key" ON "contracts"("tenantId", "contractNo");

-- CreateIndex
CREATE INDEX "contract_items_contractId_idx" ON "contract_items"("contractId");

-- CreateIndex
CREATE INDEX "payment_records_tenantId_projectId_idx" ON "payment_records"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "payment_records_tenantId_contractId_idx" ON "payment_records"("tenantId", "contractId");

-- CreateIndex
CREATE INDEX "project_expenses_tenantId_projectId_idx" ON "project_expenses"("tenantId", "projectId");

-- AddForeignKey
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_voucherAssetId_fkey" FOREIGN KEY ("voucherAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_voucherAssetId_fkey" FOREIGN KEY ("voucherAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
