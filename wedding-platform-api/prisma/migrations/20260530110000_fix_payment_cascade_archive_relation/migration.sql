-- Fix PaymentRecord: prevent cascade delete of financial data
ALTER TABLE "payment_records"
DROP CONSTRAINT IF EXISTS "payment_records_projectId_fkey",
ADD CONSTRAINT "payment_records_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT;

ALTER TABLE "payment_records"
DROP CONSTRAINT IF EXISTS "payment_records_contractId_fkey",
ADD CONSTRAINT "payment_records_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT;

-- Fix ArchivePackage: add createdBy relation
ALTER TABLE "archive_packages"
ADD CONSTRAINT "archive_packages_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT;
