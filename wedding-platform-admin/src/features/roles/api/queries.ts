import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  getRoles,
  getRoleMenus,
  assignRoleMenus,
  getAllMenus,
  createRole,
  updateRole,
  deleteRole
} from './service';
import type { Role, RoleFilters } from './types';

export type { Role };

export const roleKeys = {
  all: ['roles'] as const,
  list: (filters: RoleFilters) => [...roleKeys.all, 'list', filters] as const,
  menus: (roleId: string) => [...roleKeys.all, 'menus', roleId] as const,
  allMenus: () => [...roleKeys.all, 'allMenus'] as const
};

export const rolesQueryOptions = (filters: RoleFilters) =>
  queryOptions({ queryKey: roleKeys.list(filters), queryFn: () => getRoles(filters) });

export const roleMenusQueryOptions = (roleId: string) =>
  queryOptions({
    queryKey: roleKeys.menus(roleId),
    queryFn: () => getRoleMenus(roleId),
    enabled: !!roleId
  });

export const allMenusQueryOptions = () =>
  queryOptions({ queryKey: roleKeys.allMenus(), queryFn: () => getAllMenus() });

export const assignRoleMenusMutation = mutationOptions({
  mutationFn: ({ roleId, menuIds }: { roleId: string; menuIds: string[] }) =>
    assignRoleMenus(roleId, menuIds),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: roleKeys.all })
});

export const createRoleMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createRole>[0]) => createRole(data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: roleKeys.all })
});

export const updateRoleMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
    updateRole(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: roleKeys.all })
});

export const deleteRoleMutation = mutationOptions({
  mutationFn: (id: string) => deleteRole(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: roleKeys.all })
});
