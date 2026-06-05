export type Role = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  scope: string;
  isBuiltIn: boolean;
  tenant?: { id: string; name: string } | null;
  menus?: { menuItem: { id: string; label: string } }[];
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
