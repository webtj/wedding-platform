-- CreateTable
CREATE TABLE "ai_reference_assets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "conversationId" TEXT,
    "role" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reference_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_reference_assets_tenantId_projectId_createdAt_idx" ON "ai_reference_assets"("tenantId", "projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_reference_assets_tenantId_conversationId_createdAt_idx" ON "ai_reference_assets"("tenantId", "conversationId", "createdAt");
