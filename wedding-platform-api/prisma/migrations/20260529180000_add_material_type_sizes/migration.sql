-- Backfill for environments where AI Workbench base tables were introduced
-- outside the migration chain. Keep idempotent so shadow DB can replay safely.
CREATE TABLE IF NOT EXISTS "material_types" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "icon" TEXT,
  "defaultSize" JSONB,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "material_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_generations" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "materialTypeId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "aiPrompt" TEXT NOT NULL,
  "style" TEXT NOT NULL,
  "size" JSONB NOT NULL,
  "sourceImageUrl" TEXT,
  "resultImageUrl" TEXT,
  "resultImageUrls" JSONB,
  "resultPsdUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "material_types_tenantId_code_key"
ON "material_types"("tenantId", "code");

CREATE INDEX IF NOT EXISTS "ai_generations_tenantId_status_idx"
ON "ai_generations"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "ai_generations_userId_createdAt_idx"
ON "ai_generations"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'material_types_tenantId_fkey'
      AND table_name = 'material_types'
  ) THEN
    ALTER TABLE "material_types"
      ADD CONSTRAINT "material_types_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ai_generations_tenantId_fkey'
      AND table_name = 'ai_generations'
  ) THEN
    ALTER TABLE "ai_generations"
      ADD CONSTRAINT "ai_generations_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ai_generations_userId_fkey'
      AND table_name = 'ai_generations'
  ) THEN
    ALTER TABLE "ai_generations"
      ADD CONSTRAINT "ai_generations_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ai_generations_materialTypeId_fkey'
      AND table_name = 'ai_generations'
  ) THEN
    ALTER TABLE "ai_generations"
      ADD CONSTRAINT "ai_generations_materialTypeId_fkey"
      FOREIGN KEY ("materialTypeId") REFERENCES "material_types"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "material_types" ADD COLUMN IF NOT EXISTS "sizes" JSONB;
