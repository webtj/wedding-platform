-- Issue 1: Add FK relations to AiUsageRecord
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Issue 1: Add FK relations to AiGenerationFeedback
ALTER TABLE "ai_generation_feedback" ADD CONSTRAINT "ai_generation_feedback_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generation_feedback" ADD CONSTRAINT "ai_generation_feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generation_feedback" ADD CONSTRAINT "ai_generation_feedback_generationId_fkey"
  FOREIGN KEY ("generationId") REFERENCES "ai_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Issue 1: Add FK relations to AiReferenceAsset
ALTER TABLE "ai_reference_assets" ADD CONSTRAINT "ai_reference_assets_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_reference_assets" ADD CONSTRAINT "ai_reference_assets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_reference_assets" ADD CONSTRAINT "ai_reference_assets_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_reference_assets" ADD CONSTRAINT "ai_reference_assets_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Issue 2: Add tenantId to Material (nullable first for backfill)
ALTER TABLE "materials" ADD COLUMN "tenantId" TEXT;

-- Backfill tenantId from material_categories
UPDATE "materials" m
SET "tenantId" = mc."tenantId"
FROM "material_categories" mc
WHERE m."categoryId" = mc."id";

-- Now make it required
ALTER TABLE "materials" ALTER COLUMN "tenantId" SET NOT NULL;

-- Add FK and index
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "materials_tenantId_idx" ON "materials"("tenantId");
