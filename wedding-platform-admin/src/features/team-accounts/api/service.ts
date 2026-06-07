import { apiClient } from '@/lib/api-client';
import type { TeamMember, TeamAccountFilters, TeamAccountResponse, TeamFilterOptions } from './types';

export async function getTeamAccounts(filters: TeamAccountFilters): Promise<TeamAccountResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('pageSize', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.roleCode) params.set('roleCode', filters.roleCode);
  const qs = params.toString();
  return apiClient<TeamAccountResponse>(`/team/members${qs ? `?${qs}` : ''}`);
}

export async function getTeamFilterOptions(): Promise<TeamFilterOptions> {
  return apiClient<TeamFilterOptions>('/team/members/filter-options');
}

export async function createTeamAccount(data: {
  identifier: string;
  password: string;
  displayName: string;
  roleIds: string[];
}) {
  return apiClient<TeamMember>('/team/members', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTeamAccount(
  id: string,
  data: {
    displayName?: string;
    status?: string;
    password?: string;
    roleIds?: string[];
  }
) {
  return apiClient<TeamMember>(`/team/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteTeamAccount(id: string) {
  return apiClient<void>(`/team/members/${id}`, { method: 'DELETE' });
}
