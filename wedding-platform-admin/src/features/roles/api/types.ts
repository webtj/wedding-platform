export type Role = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  scope: string;
  isBuiltIn: boolean;
  permissionCodes?: string[];
  tenant?: { id: string; name: string } | null;
  _count?: { members: number };
};

export type RoleFilters = { page?: number; limit?: number; search?: string; tenantId?: string };

export type RoleResponse = {
  items: Role[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MenuTreeNode = {
  id: string;
  label: string;
  href?: string | null;
  children?: MenuTreeNode[];
};

/**
 * Editor payload for the role's menu assignment dialog. The server splits
 * the "what could be assigned" set from the "what is assigned" set into
 * one round-trip; this is the typed shape.
 */
export type RoleMenuState = {
  available: MenuTreeNode[];
  assigned: string[];
};
