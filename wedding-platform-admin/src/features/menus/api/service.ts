import { apiClient } from '@/lib/api-client';
import type { MenuItem } from './types';

export async function getMenus(): Promise<MenuItem[]> {
  return apiClient<MenuItem[]>('/super/menus');
}

export async function getAllMenus(): Promise<MenuItem[]> {
  return apiClient<MenuItem[]>('/super/menus/all');
}

export async function createMenu(data: {
  parentId?: string;
  label: string;
  href?: string;
  icon?: string;
  sortOrder?: number;
  visible?: boolean;
}) {
  return apiClient<MenuItem>('/super/menus', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateMenu(id: string, data: Record<string, unknown>) {
  return apiClient<MenuItem>(`/super/menus/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteMenu(id: string) {
  return apiClient<void>(`/super/menus/${id}`, { method: 'DELETE' });
}

export async function reorderMenus(items: { id: string; sortOrder: number }[]) {
  return apiClient<MenuItem[]>('/super/menus/reorder', {
    method: 'PUT',
    body: JSON.stringify({ items })
  });
}
