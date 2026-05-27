import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getMenus, createMenu, updateMenu, deleteMenu, reorderMenus } from './service';
import type { MenuItem } from './types';

export type { MenuItem };

export const menuKeys = {
  all: ['menus'] as const,
  tree: () => [...menuKeys.all, 'tree'] as const
};

export const menusQueryOptions = () =>
  queryOptions({ queryKey: menuKeys.tree(), queryFn: () => getMenus() });

export const createMenuMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createMenu>[0]) => createMenu(data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: menuKeys.all })
});

export const updateMenuMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateMenu(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: menuKeys.all })
});

export const deleteMenuMutation = mutationOptions({
  mutationFn: (id: string) => deleteMenu(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: menuKeys.all })
});

export const reorderMenusMutation = mutationOptions({
  mutationFn: (items: { id: string; sortOrder: number }[]) => reorderMenus(items),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: menuKeys.all })
});
