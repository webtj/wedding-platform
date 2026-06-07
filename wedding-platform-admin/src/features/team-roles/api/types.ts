export type TeamRole = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isBuiltIn: boolean;
  permissionCodes?: string[];
  permissions?: { permission: { id: string; code: string; name: string } }[];
  menus?: { menuItem: { id: string; label: string; href?: string | null; children?: any[] } }[];
  _count?: { members: number };
};

export type TeamRoleFilters = { page?: number; limit?: number; search?: string };

export type TeamRoleResponse = {
  items: TeamRole[];
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
