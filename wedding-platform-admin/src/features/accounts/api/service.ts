import { apiClient } from '@/lib/api-client';
import type { Account, AccountFilters, AccountResponse, FilterOptions } from './types';

export async function getAccounts(filters: AccountFilters): Promise<AccountResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('pageSize', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.tenantId) params.set('tenantId', filters.tenantId);
  if (filters.roleCode) params.set('roleCode', filters.roleCode);
  const qs = params.toString();
  return apiClient<AccountResponse>(`/super/users${qs ? `?${qs}` : ''}`);
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return apiClient<FilterOptions>('/super/users/filter-options');
}

export async function createAccount(data: {
  identifier: string;
  password: string;
  displayName: string;
  roleIds: string[];
  tenantId?: string;
}) {
  return apiClient<Account>('/super/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAccount(
  id: string,
  data: {
    displayName?: string;
    status?: string;
    password?: string;
    roleIds?: string[];
    tenantId?: string;
  }
) {
  return apiClient<Account>(`/super/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAccount(id: string) {
  return apiClient<void>(`/super/users/${id}`, { method: 'DELETE' });
}
