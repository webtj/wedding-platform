import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { invalidateMe, notifyAuthMeInvalidated } from '@/lib/auth/auth-client';
import { accountKeys } from '@/features/accounts/api/queries';
import {
  getRoles,
  getRoleMenuState,
  assignRoleMenus,
  createRole,
  updateRole,
  deleteRole
} from './service';
import type { Role, RoleFilters } from './types';

export type { Role };

export const roleKeys = {
  all: ['roles'] as const,
  list: (filters: RoleFilters) => [...roleKeys.all, 'list', filters] as const,
  menuState: (roleId: string) => [...roleKeys.all, 'menuState', roleId] as const
};

export const rolesQueryOptions = (filters: RoleFilters) =>
  queryOptions({ queryKey: roleKeys.list(filters), queryFn: () => getRoles(filters) });

export const roleMenuStateQueryOptions = (roleId: string) =>
  queryOptions({
    queryKey: roleKeys.menuState(roleId),
    queryFn: () => getRoleMenuState(roleId),
    enabled: !!roleId
  });

export const assignRoleMenusMutation = mutationOptions({
  mutationFn: ({ roleId, menuIds }: { roleId: string; menuIds: string[] }) =>
    assignRoleMenus(roleId, menuIds),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: roleKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});

export const createRoleMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createRole>[0]) => createRole(data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: roleKeys.all });
    // Role changes affect downstream consumers (account filter options, etc.)
    getQueryClient().invalidateQueries({ queryKey: accountKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});

export const updateRoleMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
    updateRole(id, data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: roleKeys.all });
    getQueryClient().invalidateQueries({ queryKey: accountKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});

export const deleteRoleMutation = mutationOptions({
  mutationFn: (id: string) => deleteRole(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: roleKeys.all });
    getQueryClient().invalidateQueries({ queryKey: accountKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});
