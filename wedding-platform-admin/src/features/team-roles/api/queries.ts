import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { invalidateMe, notifyAuthMeInvalidated } from '@/lib/auth/auth-client';
import { teamAccountKeys } from '@/features/team-accounts/api/queries';
import {
  getTeamRoles,
  getTeamRole,
  getTenantMenuTree,
  assignTeamRoleMenus,
  createTeamRole,
  updateTeamRole,
  deleteTeamRole
} from './service';
import type { TeamRole, TeamRoleFilters } from './types';

export type { TeamRole };

export const teamRoleKeys = {
  all: ['team-roles'] as const,
  list: (filters: TeamRoleFilters) => [...teamRoleKeys.all, 'list', filters] as const,
  detail: (id: string) => [...teamRoleKeys.all, 'detail', id] as const,
  tenantMenus: () => [...teamRoleKeys.all, 'tenantMenus'] as const
};

export const teamRolesQueryOptions = (filters: TeamRoleFilters) =>
  queryOptions({ queryKey: teamRoleKeys.list(filters), queryFn: () => getTeamRoles(filters) });

export const teamRoleDetailQueryOptions = (id: string) =>
  queryOptions({ queryKey: teamRoleKeys.detail(id), queryFn: () => getTeamRole(id), enabled: !!id });

export const tenantMenuTreeQueryOptions = () =>
  queryOptions({ queryKey: teamRoleKeys.tenantMenus(), queryFn: () => getTenantMenuTree() });

export const assignTeamRoleMenusMutation = mutationOptions({
  mutationFn: ({ roleId, menuItemIds }: { roleId: string; menuItemIds: string[] }) =>
    assignTeamRoleMenus(roleId, menuItemIds),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: teamRoleKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});

export const createTeamRoleMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createTeamRole>[0]) => createTeamRole(data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: teamRoleKeys.all });
    // Role changes affect downstream consumers (account filter options, etc.)
    getQueryClient().invalidateQueries({ queryKey: teamAccountKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});

export const updateTeamRoleMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
    updateTeamRole(id, data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: teamRoleKeys.all });
    getQueryClient().invalidateQueries({ queryKey: teamAccountKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});

export const deleteTeamRoleMutation = mutationOptions({
  mutationFn: (id: string) => deleteTeamRole(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: teamRoleKeys.all });
    getQueryClient().invalidateQueries({ queryKey: teamAccountKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});
