import { apiClient } from '@/lib/api-client';
import type { Role, RoleFilters, RoleResponse, MenuTreeNode } from './types';

export async function getRoles(filters: RoleFilters): Promise<RoleResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('pageSize', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.tenantId) params.set('tenantId', filters.tenantId);
  const qs = params.toString();
  return apiClient<RoleResponse>(`/super/roles${qs ? `?${qs}` : ''}`);
}

export async function getRoleMenus(roleId: string): Promise<MenuTreeNode[]> {
  return apiClient<MenuTreeNode[]>(`/super/roles/${roleId}/menus`);
}

export async function assignRoleMenus(roleId: string, menuIds: string[]) {
  return apiClient<void>(`/super/roles/${roleId}/menus`, {
    method: 'PUT',
    body: JSON.stringify({ menuIds })
  });
}

export async function getAllMenuTree(): Promise<MenuTreeNode[]> {
  return apiClient<MenuTreeNode[]>('/super/menus');
}

export async function createRole(data: {
  code: string;
  name: string;
  description?: string;
  permissionCodes?: string[];
}) {
  return apiClient<Role>('/super/roles', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateRole(id: string, data: { name?: string; description?: string }) {
  return apiClient<Role>(`/super/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteRole(id: string) {
  return apiClient<void>(`/super/roles/${id}`, { method: 'DELETE' });
}
