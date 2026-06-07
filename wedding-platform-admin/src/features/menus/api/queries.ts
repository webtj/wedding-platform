import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { invalidateMe, notifyAuthMeInvalidated } from '@/lib/auth/auth-client';
import { accountKeys } from '@/features/accounts/api/queries';
import { teamAccountKeys } from '@/features/team-accounts/api/queries';
import { roleKeys } from '@/features/roles/api/queries';
import { getMenus, createMenu, updateMenu, deleteMenu, reorderMenus } from './service';
import type { MenuItem } from './types';

export type { MenuItem };

export const menuKeys = {
  all: ['menus'] as const,
  tree: () => [...menuKeys.all, 'tree'] as const
};

export const menusQueryOptions = () =>
  queryOptions({ queryKey: menuKeys.tree(), queryFn: () => getMenus() });

/**
 * Menus carry permissionCodes that, when assigned to a role via assignMenus,
 * become the role's effective permission union. So a menu edit can change what
 * any account whose role holds that menu is allowed to call. We must invalidate
 * all roles and accounts list/filter queries so the UI re-fetches with the
 * updated permission set, and `invalidateMe()` so the current user's cached
 * permissions refresh on next request.
 */
function invalidateMenuDependents() {
  const qc = getQueryClient();
  qc.invalidateQueries({ queryKey: menuKeys.all });
  qc.invalidateQueries({ queryKey: accountKeys.all });
  qc.invalidateQueries({ queryKey: teamAccountKeys.all });
  qc.invalidateQueries({ queryKey: roleKeys.all });
  invalidateMe();
  notifyAuthMeInvalidated();
}

export const createMenuMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createMenu>[0]) => createMenu(data),
  onSuccess: invalidateMenuDependents
});

export const updateMenuMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateMenu>[1] }) =>
    updateMenu(id, data),
  onSuccess: invalidateMenuDependents
});

export const deleteMenuMutation = mutationOptions({
  mutationFn: (id: string) => deleteMenu(id),
  onSuccess: invalidateMenuDependents
});

export const reorderMenusMutation = mutationOptions({
  mutationFn: (items: { id: string; sortOrder: number }[]) => reorderMenus(items),
  onSuccess: () => {
    // Reordering only affects display order, not permissions — so we skip
    // account/role invalidation here (those would force a needless refetch
    // of the user list every time someone drags a menu up or down).
    getQueryClient().invalidateQueries({ queryKey: menuKeys.all });
    invalidateMe();
  }
});
