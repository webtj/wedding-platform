-- CreateEnum
CREATE TYPE "PromptCategoryType" AS ENUM ('image_design', 'copywriting', 'general');

-- AlterTable: Add type to quick_prompt_categories
ALTER TABLE "quick_prompt_categories" ADD COLUMN "type" "PromptCategoryType" NOT NULL DEFAULT 'general';

-- Update existing built-in categories to image_design
UPDATE "quick_prompt_categories" SET "type" = 'image_design'
WHERE "tenantId" IS NULL AND "name" IN ('摄影镜头', '光影', '色调', '人像', '背景');

-- Drop old ai_templates table
DROP TABLE IF EXISTS "ai_templates" CASCADE;

-- Drop old enum
DROP TYPE IF EXISTS "AiTemplateCategory";
