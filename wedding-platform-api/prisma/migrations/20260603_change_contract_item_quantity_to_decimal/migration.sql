-- AlterTable
ALTER TABLE "contract_items" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30) USING "quantity"::DECIMAL(65,30);
