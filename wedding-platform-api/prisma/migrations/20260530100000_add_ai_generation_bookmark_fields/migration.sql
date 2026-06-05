ALTER TABLE "ai_generations"
ADD COLUMN "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bookmarkedAt" TIMESTAMPTZ,
ADD COLUMN "businessTags" JSONB;

CREATE INDEX "ai_generations_tenantId_isBookmarked_createdAt_idx"
ON "ai_generations"("tenantId", "isBookmarked", "createdAt");
