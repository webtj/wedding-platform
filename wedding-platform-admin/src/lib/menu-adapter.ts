import type { NavGroup, NavItem } from '@/types';
import type { MenuItemData } from '@/lib/auth/types';
import { Icons } from '@/components/icons';

const VALID_ICONS = new Set(Object.keys(Icons));

function convertMenuItem(item: MenuItemData): NavItem {
  const icon = item.icon;
  const validIcon = icon && VALID_ICONS.has(icon) ? (icon as NavItem['icon']) : undefined;

  return {
    title: item.label,
    url: item.href ?? '#',
    icon: validIcon,
    isActive: false,
    items: item.children?.map(convertMenuItem) ?? []
  };
}

export function menusToNavGroups(menus: MenuItemData[]): NavGroup[] {
  if (!menus || menus.length === 0) return [];

  return [
    {
      label: '',
      items: menus.map(convertMenuItem)
    }
  ];
}
