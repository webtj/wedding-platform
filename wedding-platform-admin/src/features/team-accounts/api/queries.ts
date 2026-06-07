import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { invalidateMe, notifyAuthMeInvalidated } from '@/lib/auth/auth-client';
import {
  getTeamAccounts,
  getTeamFilterOptions,
  createTeamAccount,
  updateTeamAccount,
  deleteTeamAccount
} from './service';
import type { TeamMember, TeamAccountFilters } from './types';

export type { TeamMember };

export const teamAccountKeys = {
  all: ['team-accounts'] as const,
  list: (filters: TeamAccountFilters) => [...teamAccountKeys.all, 'list', filters] as const,
  filterOptions: () => [...teamAccountKeys.all, 'filterOptions'] as const
};

export const teamAccountsQueryOptions = (filters: TeamAccountFilters) =>
  queryOptions({ queryKey: teamAccountKeys.list(filters), queryFn: () => getTeamAccounts(filters) });

export const teamFilterOptionsQueryOptions = () =>
  queryOptions({
    queryKey: teamAccountKeys.filterOptions(),
    queryFn: () => getTeamFilterOptions()
  });

export const createTeamAccountMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createTeamAccount>[0]) => createTeamAccount(data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: teamAccountKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});

export const updateTeamAccountMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTeamAccount>[1] }) =>
    updateTeamAccount(id, data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: teamAccountKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});

export const deleteTeamAccountMutation = mutationOptions({
  mutationFn: (id: string) => deleteTeamAccount(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: teamAccountKeys.all });
    invalidateMe();
    notifyAuthMeInvalidated();
  }
});
