import { apiClient } from '@/lib/api-client';
import type { MaterialCategory, Material, TaskMaterial } from './types';

export function getCategories() {
  return apiClient<MaterialCategory[]>('/material-categories');
}

export function createCategory(data: { name: string; sortOrder?: number }) {
  return apiClient<MaterialCategory>('/material-categories', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function updateCategory(id: string, data: Partial<MaterialCategory>) {
  return apiClient<MaterialCategory>(`/material-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export function deleteCategory(id: string) {
  return apiClient<void>(`/material-categories/${id}`, { method: 'DELETE' });
}

export function getMaterials(categoryId?: string, page = 1, pageSize = 50) {
  const params = new URLSearchParams();
  if (categoryId) params.set('categoryId', categoryId);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return apiClient<{ items: Material[]; total: number }>(`/materials?${params}`);
}

export function createMaterial(data: Partial<Material>) {
  return apiClient<Material>('/materials', { method: 'POST', body: JSON.stringify(data) });
}

export function updateMaterial(id: string, data: Partial<Material>) {
  return apiClient<Material>(`/materials/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteMaterial(id: string) {
  return apiClient<void>(`/materials/${id}`, { method: 'DELETE' });
}

export function getTaskMaterials(taskId: string) {
  return apiClient<TaskMaterial[]>(`/tasks/${taskId}/materials`);
}

export function addTaskMaterial(taskId: string, materialId: string) {
  return apiClient<TaskMaterial>(`/tasks/${taskId}/materials`, {
    method: 'POST',
    body: JSON.stringify({ materialId })
  });
}

export function removeTaskMaterial(id: string) {
  return apiClient<void>(`/task-materials/${id}`, { method: 'DELETE' });
}

export function confirmTaskMaterial(id: string, confirmed: boolean) {
  return apiClient<TaskMaterial>(`/task-materials/${id}/confirm`, {
    method: 'PATCH',
    body: JSON.stringify({ confirmed })
  });
}
