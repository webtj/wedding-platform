-- Drop isPlatformAdmin column from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "isPlatformAdmin";

-- Remove 'platform' value from RoleScope enum
-- PostgreSQL doesn't support ALTER TYPE ... DROP VALUE, so we need to:
-- 1. Rename old enum
-- 2. Create new enum without 'platform'
-- 3. Update all columns using the old enum
-- 4. Drop old enum

-- Step 1: Rename old enum
ALTER TYPE "RoleScope" RENAME TO "RoleScope_old";

-- Step 2: Create new enum without 'platform'
CREATE TYPE "RoleScope" AS ENUM ('tenant');

-- Step 3: Update columns using the old enum
ALTER TABLE "roles" ALTER COLUMN "scope" TYPE "RoleScope" USING "scope"::text::"RoleScope";

-- Step 4: Drop old enum
DROP TYPE "RoleScope_old";
