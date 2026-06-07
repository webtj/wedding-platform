export type MenuItem = {
  id: string;
  label: string;
  href?: string | null;
  icon?: string | null;
  sortOrder: number;
  visible: boolean;
  scope: string;
  parentId?: string | null;
  permissionCodes: string[];
  children?: MenuItem[];
};

export type CreateMenuItemPayload = {
  parentId?: string;
  label: string;
  href?: string;
  icon?: string;
  sortOrder?: number;
  visible?: boolean;
  permissionCodes: string[];
};

export type UpdateMenuItemPayload = {
  parentId?: string | null;
  label?: string;
  href?: string | null;
  icon?: string | null;
  sortOrder?: number;
  visible?: boolean;
  permissionCodes?: string[];
};
