ALTER TABLE "ai_generations"
ADD COLUMN "conversationId" TEXT,
ADD COLUMN "parentGenerationId" TEXT;

CREATE INDEX "ai_generations_tenantId_conversationId_createdAt_idx"
ON "ai_generations"("tenantId", "conversationId", "createdAt");

CREATE INDEX "ai_generations_parentGenerationId_idx"
ON "ai_generations"("parentGenerationId");
