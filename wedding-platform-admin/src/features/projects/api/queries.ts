import { queryOptions } from '@tanstack/react-query';
import { getProjects, getProjectById } from './service';
import type { Project, ProjectFilters } from './types';

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

import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { updateProject } from './service';
import type { ProjectMutationPayload } from './types';

export const updateProjectMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: ProjectMutationPayload }) =>
    updateProject(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: projectKeys.all })
});
