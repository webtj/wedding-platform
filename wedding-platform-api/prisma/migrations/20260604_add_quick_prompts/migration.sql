-- CreateTable
CREATE TABLE "quick_prompt_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_prompt_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_prompts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quick_prompt_categories_tenantId_idx" ON "quick_prompt_categories"("tenantId");

-- CreateIndex
CREATE INDEX "quick_prompts_tenantId_idx" ON "quick_prompts"("tenantId");

-- CreateIndex
CREATE INDEX "quick_prompts_categoryId_idx" ON "quick_prompts"("categoryId");

-- AddForeignKey
ALTER TABLE "quick_prompt_categories" ADD CONSTRAINT "quick_prompt_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_prompts" ADD CONSTRAINT "quick_prompts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_prompts" ADD CONSTRAINT "quick_prompts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "quick_prompt_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
