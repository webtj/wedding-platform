DO $$ BEGIN ALTER TYPE "AiGenerationJobStatus" ADD VALUE 'processing'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "AiGenerationJobStatus" ADD VALUE 'completed'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "AiGenerationType" ADD VALUE 'edit'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "AiGenerationType" ADD VALUE 'upscale'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "ReferenceAssetRole" ADD VALUE 'style'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "ReferenceAssetRole" ADD VALUE 'subject'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "ReferenceAssetRole" ADD VALUE 'pet'; EXCEPTION WHEN duplicate_object THEN null; END $$;
