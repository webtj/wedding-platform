-- CreateTable
CREATE TABLE "ai_generation_images" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "provider" TEXT,
    "model" TEXT,
    "seed" TEXT,
    "metadata" JSONB,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_generation_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_generation_images_generationId_index_key" ON "ai_generation_images"("generationId", "index");

-- CreateIndex
CREATE INDEX "ai_generation_images_tenantId_createdAt_idx" ON "ai_generation_images"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_generation_images_tenantId_updatedAt_idx" ON "ai_generation_images"("tenantId", "updatedAt");

-- AddForeignKey
ALTER TABLE "ai_generation_images" ADD CONSTRAINT "ai_generation_images_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "ai_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
