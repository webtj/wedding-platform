-- AlterTable: Add projectId column to ai_generations
ALTER TABLE "ai_generations" ADD COLUMN "projectId" TEXT;

-- CreateIndex: Composite index on (tenantId, projectId, createdAt)
CREATE INDEX "ai_generations_tenantId_projectId_createdAt_idx" ON "ai_generations"("tenantId", "projectId", "createdAt");

-- AddForeignKey: projectId references projects(id) with ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ai_generations_projectId_fkey'
      AND table_name = 'ai_generations'
  ) THEN
    ALTER TABLE "ai_generations"
      ADD CONSTRAINT "ai_generations_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "projects"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
