export type MenuItem = {
  id: string;
  label: string;
  href?: string | null;
  icon?: string | null;
  sortOrder: number;
  visible: boolean;
  scope: string;
  parentId?: string | null;
  children?: MenuItem[];
};
