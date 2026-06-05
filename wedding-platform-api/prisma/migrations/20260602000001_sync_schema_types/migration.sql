-- Create missing enums that schema references but DB doesn't have
DO $$ BEGIN CREATE TYPE "AiGenerationType" AS ENUM ('text2img','img2img','refine','series'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AiGenerationStatus" AS ENUM ('pending','processing','completed','failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AiGenerationJobStatus" AS ENUM ('queued','running','done','failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "MessageRole" AS ENUM ('user','assistant','system'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ReferenceAssetRole" AS ENUM ('source','reference','result'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Fix type mismatches: drop defaults, alter, re-add
ALTER TABLE "ai_generations" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "ai_generations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ai_generation_jobs" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "ai_generations" ALTER COLUMN "type" TYPE "AiGenerationType" USING "type"::text::"AiGenerationType";
ALTER TABLE "ai_generations" ALTER COLUMN "status" TYPE "AiGenerationStatus" USING "status"::text::"AiGenerationStatus";
ALTER TABLE "ai_generation_jobs" ALTER COLUMN "status" TYPE "AiGenerationJobStatus" USING "status"::text::"AiGenerationJobStatus";
ALTER TABLE "ai_conversation_messages" ALTER COLUMN "role" TYPE "MessageRole" USING "role"::text::"MessageRole";
ALTER TABLE "ai_reference_assets" ALTER COLUMN "role" TYPE "ReferenceAssetRole" USING "role"::text::"ReferenceAssetRole";

-- Restore defaults
ALTER TABLE "ai_generations" ALTER COLUMN "type" SET DEFAULT 'text2img';
ALTER TABLE "ai_generations" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "ai_generation_jobs" ALTER COLUMN "status" SET DEFAULT 'queued';

-- Add missing indexes
CREATE INDEX IF NOT EXISTS "ai_generations_tenantId_status_idx" ON "ai_generations"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ai_generation_jobs_tenantId_status_idx" ON "ai_generation_jobs"("tenantId", "status");
