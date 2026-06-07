import { Icons } from '@/components/icons';
import type { NavBadgeSourceKey } from '@/config/nav-badges';

export interface PermissionCheck {
  permission?: string;
  plan?: string;
  feature?: string;
  role?: string;
  requireOrg?: boolean;
}

export interface NavItem {
  title: string;
  url: string;
  disabled?: boolean;
  external?: boolean;
  shortcut?: [string, string];
  icon?: keyof typeof Icons;
  label?: string;
  description?: string;
  isActive?: boolean;
  items?: NavItem[];
  access?: PermissionCheck;
  badgeKey?: NavBadgeSourceKey;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
