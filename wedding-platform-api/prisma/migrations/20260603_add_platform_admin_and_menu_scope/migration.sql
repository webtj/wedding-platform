-- CreateEnum
CREATE TYPE "PlatformAdminLevel" AS ENUM ('super', 'admin');

-- CreateEnum
CREATE TYPE "MenuScope" AS ENUM ('platform', 'tenant');

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "PlatformAdminLevel" NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_userId_key" ON "platform_admins"("userId");

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add isPlatformAdmin to users
ALTER TABLE "users" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Change menu_items.scope from RoleScope to MenuScope
ALTER TABLE "menu_items" ALTER COLUMN "scope" TYPE "MenuScope" USING ("scope"::text::"MenuScope");
