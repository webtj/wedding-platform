import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addStage,
  updateStage,
  deleteStage,
  addTask,
  updateTask,
  deleteTask,
  applyTemplate
} from './service';
import type { TemplateFilters } from './types';

export const templateKeys = {
  all: ['templates'] as const,
  list: (f: TemplateFilters) => [...templateKeys.all, 'list', f] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const
};

export const templatesQueryOptions = (filters: TemplateFilters) =>
  queryOptions({ queryKey: templateKeys.list(filters), queryFn: () => getTemplates(filters) });

export const templateByIdOptions = (id: string) =>
  queryOptions({ queryKey: templateKeys.detail(id), queryFn: () => getTemplate(id) });

export const createTemplateMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createTemplate>[0]) => createTemplate(data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});

export const updateTemplateMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTemplate>[1] }) =>
    updateTemplate(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});

export const deleteTemplateMutation = mutationOptions({
  mutationFn: (id: string) => deleteTemplate(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});

export const addStageMutation = mutationOptions({
  mutationFn: ({
    templateId,
    data
  }: {
    templateId: string;
    data: Parameters<typeof addStage>[1];
  }) => addStage(templateId, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});

export const updateStageMutation = mutationOptions({
  mutationFn: ({ stageId, data }: { stageId: string; data: Parameters<typeof updateStage>[1] }) =>
    updateStage(stageId, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});

export const deleteStageMutation = mutationOptions({
  mutationFn: (stageId: string) => deleteStage(stageId),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});

export const addTaskMutation = mutationOptions({
  mutationFn: ({ stageId, data }: { stageId: string; data: Parameters<typeof addTask>[1] }) =>
    addTask(stageId, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});

export const updateTaskMutation = mutationOptions({
  mutationFn: ({ taskId, data }: { taskId: string; data: Parameters<typeof updateTask>[1] }) =>
    updateTask(taskId, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});

export const deleteTaskMutation = mutationOptions({
  mutationFn: (taskId: string) => deleteTask(taskId),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});

export const applyTemplateMutation = mutationOptions({
  mutationFn: ({ projectId, templateId }: { projectId: string; templateId: string }) =>
    applyTemplate(projectId, templateId),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
});
