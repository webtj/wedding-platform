import { NavGroup } from '@/types';
import { useAuthContext } from '@/lib/auth/auth-context';
import { menusToNavGroups } from '@/lib/menu-adapter';

export function useDynamicNavGroups(): NavGroup[] {
  const { isLoaded, menus, isPlatformAdmin } = useAuthContext();
  if (!isLoaded) return [];

  // Try DB-driven menus first
  const dynamic = menusToNavGroups(menus);
  if (dynamic.length > 0) return dynamic;

  // Fallback: platform admin gets platform management defaults
  if (isPlatformAdmin) {
    return [
      {
        label: '平台',
        items: [
          {
            title: '平台总览',
            url: '/admin/overview',
            icon: 'dashboard',
            isActive: false,
            items: []
          },
          {
            title: '租户管理',
            url: '/admin/tenants',
            icon: 'workspace',
            isActive: false,
            items: []
          },
          {
            title: '账号管理',
            url: '/admin/accounts',
            icon: 'user',
            isActive: false,
            items: []
          },
          {
            title: '角色管理',
            url: '/admin/roles',
            icon: 'teams',
            isActive: false,
            items: []
          },
          {
            title: '菜单管理',
            url: '/admin/menus',
            icon: 'panelLeft',
            isActive: false,
            items: []
          }
        ]
      },
      {
        label: '运营',
        items: [
          {
            title: '套餐计费',
            url: '/admin/billing',
            icon: 'billing',
            isActive: false,
            items: []
          },
          {
            title: '素材管理',
            url: '/admin/material-types',
            icon: 'product',
            isActive: false,
            items: []
          },
          {
            title: 'AI 用量分析',
            url: '/admin/ai-usage',
            icon: 'sparkles',
            isActive: false,
            items: []
          }
        ]
      }
    ];
  }

  return [];
}

/**
 * Returns project-scoped navigation items that only appear
 * when the user is inside a project route (/studio/projects/:projectId/...).
 */
export function getProjectNavGroups(projectId: string): NavGroup[] {
  return [
    {
      label: '项目',
      items: [
        {
          title: 'AI 生成视觉',
          url: `/studio/projects/${projectId}/ai-workbench`,
          icon: 'media',
          isActive: false,
          items: []
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
      { title: '工作台', url: '/studio/overview', icon: 'dashboard', shortcut: ['d', 'd'], isActive: false, items: [] },
      { title: '意向单', url: '/studio/leads', icon: 'forms', shortcut: ['l', 'l'], isActive: false, items: [] },
      { title: '线索统计', url: '/studio/leads/stats', icon: 'trendingUp', shortcut: ['l', 's'], isActive: false, items: [] },
      { title: '婚礼日程', url: '/studio/timeline', icon: 'calendar', shortcut: ['t', 't'], isActive: false, items: [] },
      { title: '项目管理', url: '/studio/projects', icon: 'kanban', shortcut: ['p', 'p'], isActive: false, items: [] },
      { title: '合同管理', url: '/studio/contracts', icon: 'post', shortcut: ['c', 'c'], isActive: false, items: [] },
      { title: '消息中心', url: '/studio/notifications', icon: 'notification', shortcut: ['n', 'n'], isActive: false, items: [] }
    ]
  },
  {
    label: 'AI 工具',
    items: [
      { title: 'AI 工作台', url: '/studio/ai-workbench', icon: 'sparkles', shortcut: ['a', 'a'], isActive: false, items: [] },
      { title: '生图模板', url: '/studio/ai-workbench/templates', icon: 'palette', shortcut: ['a', 't'], isActive: false, items: [] },
      { title: '素材管理', url: '/studio/material-types', icon: 'product', shortcut: ['m', 't'], isActive: false, items: [] },
      { title: 'AI 文案生成', url: '/studio/ai-workbench/text', icon: 'post', shortcut: ['a', 'x'], isActive: false, items: [] }
    ]
  },
  {
    label: '平台管理',
    items: [
      { title: '租户管理', url: '/admin/tenants', icon: 'workspace', shortcut: ['t', 't'], isActive: false, items: [] },
      { title: '账号管理', url: '/admin/accounts', icon: 'user', shortcut: ['a', 'a'], isActive: false, items: [] },
      { title: '角色管理', url: '/admin/roles', icon: 'teams', shortcut: ['r', 'r'], isActive: false, items: [] },
      { title: '菜单管理', url: '/admin/menus', icon: 'panelLeft', shortcut: ['m', 'm'], isActive: false, items: [] },
      { title: '通用设置', url: '/admin/settings', icon: 'settings', shortcut: ['s', 's'], isActive: false, items: [] },
      { title: '素材管理', url: '/admin/material-types', icon: 'product', shortcut: ['m', 't'], isActive: false, items: [] },
      { title: 'AI 用量分析', url: '/admin/ai-usage', icon: 'sparkles', shortcut: ['a', 'u'], isActive: false, items: [] }
    ]
  }
];
