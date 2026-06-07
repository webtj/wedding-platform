-- AlterTable: Make tenantId optional on material_categories
ALTER TABLE "material_categories" ALTER COLUMN "tenantId" DROP NOT NULL;

-- AlterTable: Make tenantId optional on materials
ALTER TABLE "materials" ALTER COLUMN "tenantId" DROP NOT NULL;
