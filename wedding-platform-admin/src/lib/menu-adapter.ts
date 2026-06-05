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

  // Separate platform and tenant menus
  const platformMenus = menus.filter((m) => m.scope === 'platform');
  const tenantMenus = menus.filter((m) => m.scope !== 'platform');

  const groups: NavGroup[] = [];

  if (platformMenus.length > 0) {
    groups.push({
      label: '平台',
      items: platformMenus.map(convertMenuItem)
    });
  }

  if (tenantMenus.length > 0) {
    groups.push({
      label: '',
      items: tenantMenus.map(convertMenuItem)
    });
  }

  return groups;
}
