import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getProjects, getProjectById, updateProject, createProjectFromContract } from './service';
import type { Project, ProjectFilters, ProjectMutationPayload } from './types';

export type { Project };

export const projectKeys = {
  all: ['projects'] as const,
  list: (filters: ProjectFilters) => [...projectKeys.all, 'list', filters] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const
};

export const projectsQueryOptions = (filters: ProjectFilters) =>
  queryOptions({
    queryKey: projectKeys.list(filters),
    queryFn: () => getProjects(filters)
  });

export const projectByIdOptions = (id: string) =>
  queryOptions({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProjectById(id)
  });

export const updateProjectMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: ProjectMutationPayload }) =>
    updateProject(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: projectKeys.all })
});

export const createProjectFromContractMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createProjectFromContract>[0]) =>
    createProjectFromContract(data),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: projectKeys.all });
    qc.invalidateQueries({ queryKey: ['contracts'] });
  }
});
