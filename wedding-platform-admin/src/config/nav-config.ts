import { NavGroup } from '@/types';
import { useAuthContext } from '@/lib/auth/auth-context';
import { menusToNavGroups } from '@/lib/menu-adapter';

export function useDynamicNavGroups(): NavGroup[] {
  const { isLoaded, menus } = useAuthContext();
  if (!isLoaded) return [];
  const dynamic = menusToNavGroups(menus);
  if (dynamic.length > 0) return dynamic;

  // Fallback: super admin who has no DB menus gets platform management defaults
  return [
    {
      label: '平台管理',
      items: [
        {
          title: '租户管理',
          url: '/admin/tenants',
          icon: 'workspace',
          isActive: false,
          items: [],
          access: { role: 'super_admin' }
        },
        {
          title: '账号管理',
          url: '/admin/accounts',
          icon: 'user',
          isActive: false,
          items: [],
          access: { role: 'super_admin' }
        },
        {
          title: '角色管理',
          url: '/admin/roles',
          icon: 'teams',
          isActive: false,
          items: [],
          access: { role: 'super_admin' }
        },
        {
          title: '菜单管理',
          url: '/admin/menus',
          icon: 'panelLeft',
          isActive: false,
          items: [],
          access: { role: 'super_admin' }
        }
      ]
    }
  ];
}

/**
 * Wedding SaaS Platform — Static nav for reference/kbar.
 * The sidebar uses useDynamicNavGroups() which returns DB menus when available.
 */
export const navGroups: NavGroup[] = [
  {
    label: '业务管理',
    items: [
      {
        title: '工作台',
        url: '/studio/overview',
        icon: 'dashboard',
        shortcut: ['d', 'd'],
        isActive: false,
        items: []
      },
      {
        title: '意向单',
        url: '/studio/leads',
        icon: 'forms',
        shortcut: ['l', 'l'],
        isActive: false,
        items: [],
        access: { role: 'planner' }
      },
      {
        title: '项目管理',
        url: '/studio/projects',
        icon: 'kanban',
        shortcut: ['p', 'p'],
        isActive: false,
        items: [],
        access: { role: 'planner' }
      },
      {
        title: '合同管理',
        url: '/studio/contracts',
        icon: 'post',
        shortcut: ['c', 'c'],
        isActive: false,
        items: [],
        access: { role: 'planner' }
      },
      {
        title: '财务管理',
        url: '/studio/finance',
        icon: 'creditCard',
        shortcut: ['f', 'f'],
        isActive: false,
        items: [],
        access: { role: 'planner' }
      }
    ]
  },
  {
    label: '平台管理',
    items: [
      {
        title: '租户管理',
        url: '/admin/tenants',
        icon: 'workspace',
        shortcut: ['t', 't'],
        isActive: false,
        items: [],
        access: { role: 'super_admin' }
      },
      {
        title: '账号管理',
        url: '/admin/accounts',
        icon: 'user',
        shortcut: ['a', 'a'],
        isActive: false,
        items: [],
        access: { role: 'super_admin' }
      },
      {
        title: '角色管理',
        url: '/admin/roles',
        icon: 'teams',
        shortcut: ['r', 'r'],
        isActive: false,
        items: [],
        access: { role: 'super_admin' }
      },
      {
        title: '菜单管理',
        url: '/admin/menus',
        icon: 'panelLeft',
        shortcut: ['m', 'm'],
        isActive: false,
        items: [],
        access: { role: 'super_admin' }
      }
    ]
  }
];
