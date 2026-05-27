import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { updateProject } from './service';
import { projectKeys } from './queries';
import type { ProjectMutationPayload } from './types';

export const updateProjectMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: ProjectMutationPayload }) =>
    updateProject(id, values),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: projectKeys.all });
  }
});
