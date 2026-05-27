import { apiClient } from '@/lib/api-client';
import type { Project, ProjectFilters, ProjectResponse, ProjectMutationPayload } from './types';

export async function getProjects(filters: ProjectFilters): Promise<ProjectResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('pageSize', String(filters.limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  return apiClient<ProjectResponse>(`/projects${qs ? `?${qs}` : ''}`);
}

export async function getProjectById(id: string): Promise<Project> {
  return apiClient<Project>(`/projects/${id}`);
}

export async function updateProject(id: string, data: ProjectMutationPayload) {
  return apiClient<Project>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function createProjectFromContract(data: Record<string, unknown>) {
  return apiClient<Project>('/projects/from-contract', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
