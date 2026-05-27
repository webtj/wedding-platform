import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  getAccounts,
  getFilterOptions,
  createAccount,
  updateAccount,
  deleteAccount
} from './service';
import type { Account, AccountFilters } from './types';

export type { Account };

export const accountKeys = {
  all: ['accounts'] as const,
  list: (filters: AccountFilters) => [...accountKeys.all, 'list', filters] as const,
  filterOptions: () => [...accountKeys.all, 'filterOptions'] as const
};

export const accountsQueryOptions = (filters: AccountFilters) =>
  queryOptions({ queryKey: accountKeys.list(filters), queryFn: () => getAccounts(filters) });

export const filterOptionsQueryOptions = () =>
  queryOptions({
    queryKey: accountKeys.filterOptions(),
    queryFn: () => getFilterOptions(),
    staleTime: 5 * 60 * 1000
  });

export const createAccountMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createAccount>[0]) => createAccount(data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: accountKeys.all })
});

export const updateAccountMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateAccount>[1] }) =>
    updateAccount(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: accountKeys.all })
});

export const deleteAccountMutation = mutationOptions({
  mutationFn: (id: string) => deleteAccount(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: accountKeys.all })
});
