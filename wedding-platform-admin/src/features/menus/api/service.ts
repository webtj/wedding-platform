import { apiClient } from '@/lib/api-client';
import type {
  CreateMenuItemPayload,
  MenuItem,
  UpdateMenuItemPayload
} from './types';

export async function getMenus(): Promise<MenuItem[]> {
  return apiClient<MenuItem[]>('/super/menus');
}

export async function getAllMenus(): Promise<MenuItem[]> {
  return apiClient<MenuItem[]>('/super/menus/all');
}

export async function createMenu(data: CreateMenuItemPayload) {
  return apiClient<MenuItem>('/super/menus', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateMenu(id: string, data: UpdateMenuItemPayload) {
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
