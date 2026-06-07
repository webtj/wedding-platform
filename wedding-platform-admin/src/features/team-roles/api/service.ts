import { apiClient } from '@/lib/api-client';
import type { TeamRole, TeamRoleFilters, TeamRoleResponse, MenuTreeNode } from './types';

export async function getTeamRoles(filters: TeamRoleFilters): Promise<TeamRoleResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('pageSize', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  return apiClient<TeamRoleResponse>(`/team/roles${qs ? `?${qs}` : ''}`);
}

export async function getTeamRole(id: string): Promise<TeamRole> {
  return apiClient<TeamRole>(`/team/roles/${id}`);
}

export async function getTenantMenuTree(): Promise<MenuTreeNode[]> {
  return apiClient<MenuTreeNode[]>('/team/menus');
}

export async function assignTeamRoleMenus(roleId: string, menuItemIds: string[]) {
  return apiClient<void>(`/team/roles/${roleId}/menus`, {
    method: 'PUT',
    body: JSON.stringify({ menuItemIds })
  });
}

export async function createTeamRole(data: {
  code: string;
  name: string;
  description?: string;
  permissionCodes?: string[];
}) {
  return apiClient<TeamRole>('/team/roles', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTeamRole(
  id: string,
  data: { name?: string; description?: string; permissionCodes?: string[]; menuItemIds?: string[] }
) {
  return apiClient<TeamRole>(`/team/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteTeamRole(id: string) {
  return apiClient<void>(`/team/roles/${id}`, { method: 'DELETE' });
}
