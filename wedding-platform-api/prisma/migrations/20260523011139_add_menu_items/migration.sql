-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "scope" "RoleScope" NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "href" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_menu_items" (
    "roleId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,

    CONSTRAINT "role_menu_items_pkey" PRIMARY KEY ("roleId","menuItemId")
);

-- CreateIndex
CREATE INDEX "menu_items_tenantId_idx" ON "menu_items"("tenantId");

-- CreateIndex
CREATE INDEX "menu_items_parentId_idx" ON "menu_items"("parentId");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu_items" ADD CONSTRAINT "role_menu_items_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu_items" ADD CONSTRAINT "role_menu_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
