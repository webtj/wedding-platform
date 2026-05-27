import { apiClient } from '@/lib/api-client';
import type { ProcessTemplate, TemplateFilters, TemplateStage, TemplateTask } from './types';

export async function getTemplates(filters: TemplateFilters) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('pageSize', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  const qs = params.toString();
  return apiClient<{ items: ProcessTemplate[]; total: number }>(`/templates${qs ? `?${qs}` : ''}`);
}

export async function getTemplate(id: string) {
  return apiClient<ProcessTemplate & { stages: TemplateStage[] }>(`/templates/${id}`);
}

export async function createTemplate(data: Partial<ProcessTemplate>) {
  return apiClient<ProcessTemplate>('/templates', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTemplate(id: string, data: Partial<ProcessTemplate>) {
  return apiClient<ProcessTemplate>(`/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteTemplate(id: string) {
  return apiClient<void>(`/templates/${id}`, { method: 'DELETE' });
}

export async function duplicateTemplate(id: string) {
  return apiClient<any>(`/templates/${id}/duplicate`, { method: 'POST' });
}

export async function addStage(
  templateId: string,
  data: { name: string; description?: string; sortOrder?: number }
) {
  return apiClient<TemplateStage>(`/templates/${templateId}/stages`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateStage(stageId: string, data: Partial<TemplateStage>) {
  return apiClient<TemplateStage>(`/templates/stages/${stageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteStage(stageId: string) {
  return apiClient<void>(`/templates/stages/${stageId}`, { method: 'DELETE' });
}

export async function addTask(stageId: string, data: Partial<TemplateTask>) {
  return apiClient<TemplateTask>(`/templates/stages/${stageId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateTask(taskId: string, data: Partial<TemplateTask>) {
  return apiClient<TemplateTask>(`/templates/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteTask(taskId: string) {
  return apiClient<void>(`/templates/tasks/${taskId}`, { method: 'DELETE' });
}

export async function applyTemplate(projectId: string, templateId: string, reset?: boolean) {
  return apiClient<unknown>(`/projects/${projectId}/apply-template`, {
    method: 'POST',
    body: JSON.stringify({ templateId, reset: reset ?? false })
  });
}
